import Sale from '../models/Sale.model.js';
import Product from '../models/Product.model.js';
import { generateSaleNumber } from '../utils/generateSaleNumber.js';

/**
 * @desc    Get all sales
 * @route   GET /api/sales
 * @access  Private
 */
export const getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, cashier, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        // Parse date string (YYYY-MM-DD) and set to local midnight
        const [year, month, day] = startDate.split('-').map(Number);
        const start = new Date(year, month - 1, day, 0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        // Parse date string (YYYY-MM-DD) and set to local end of day
        const [year, month, day] = endDate.split('-').map(Number);
        const end = new Date(year, month - 1, day, 23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (cashier) filter.cashier = cashier;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Use Promise.all for parallel execution
    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate('cashier', 'username')
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Sale.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: sales.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single sale
 * @route   GET /api/sales/:id
 * @access  Private
 */
export const getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'username')
      .populate('items.product');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new sale
 * @route   POST /api/sales
 * @access  Private/Supplier/Staff
 */
export const createSale = async (req, res, next) => {
  try {
    const { items, paymentMethod, customerName, customerEmail, customerPhone } = req.body;

    // Fetch all products at once to avoid N+1 query problem
    const productIds = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    // Validate all products exist
    if (products.length !== items.length) {
      const foundIds = products.map(p => p._id.toString());
      const missingId = productIds.find(id => !foundIds.includes(id.toString()));
      return res.status(404).json({
        success: false,
        message: `Product with ID ${missingId} not found`
      });
    }

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Validate stock and calculate totals
    let subtotal = 0;
    const saleItems = [];

    for (const item of items) {
      const product = productMap.get(item.product.toString());
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
        });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      saleItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal
      });

      // Update product stock in memory
      product.stockQuantity -= item.quantity;
    }

    // Bulk update all products at once
    await Promise.all(products.map(product => product.save()));

    // Calculate VAT (12%)
    const vatRate = 0.12;
    const discount = 0; // No discount
    const tax = subtotal * vatRate;
    const total = subtotal + tax;

    const saleNumber = await generateSaleNumber();

    const sale = await Sale.create({
      saleNumber,
      customerName,
      customerEmail,
      customerPhone,
      items: saleItems,
      subtotal,
      discount: 0, // No discount
      tax, // 12% VAT
      total,
      paymentMethod,
      cashier: req.user._id,
      receiptGenerated: true
    });

    await sale.populate('cashier', 'username');
    await sale.populate('items.product', 'name price');

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Void a sale (revert stock and mark as void)
 * @route   PATCH /api/sales/:id/void
 * @access  Private/Admin/Staff
 */
export const voidSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('items.product', 'name stockQuantity');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.isVoid) {
      return res.status(400).json({
        success: false,
        message: 'Sale is already voided'
      });
    }

    // Revert stock quantities for all products in the sale (bulk operation)
    const productIds = sale.items.map(item => {
      return item.product._id || item.product;
    });
    
    const products = await Product.find({ _id: { $in: productIds } });
    
    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more products not found'
      });
    }

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    
    // Update stock quantities in memory
    for (const item of sale.items) {
      const productId = (item.product._id || item.product).toString();
      const product = productMap.get(productId);
      
      if (product) {
        product.stockQuantity += item.quantity;
      }
    }

    // Bulk update all products at once
    await Promise.all(products.map(product => product.save()));

    // Mark sale as void
    sale.isVoid = true;
    sale.voidedAt = new Date();
    sale.voidedBy = req.user._id;
    await sale.save();

    await sale.populate('cashier', 'username');
    await sale.populate('voidedBy', 'username');
    await sale.populate('items.product', 'name price');

    res.json({
      success: true,
      message: 'Sale voided successfully. Stock quantities have been restored.',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

