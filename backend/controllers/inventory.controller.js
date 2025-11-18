import Product from '../models/Product.model.js';
import Supplier from '../models/Supplier.model.js';

/**
 * @desc    Get inventory status
 * @route   GET /api/inventory
 * @access  Private
 */
export const getInventory = async (req, res, next) => {
  try {
    const { lowStock } = req.query;
    const filter = { isActive: true };

    // If user is a supplier, only show their own products
    if (req.user.role === 'supplier') {
      const supplierRecord = await Supplier.findOne({ userId: req.user._id });
      if (!supplierRecord) {
        return res.status(403).json({
          success: false,
          message: 'Supplier record not found'
        });
      }
      filter.supplier = supplierRecord._id;
    }

    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }

    const products = await Product.find(filter)
      .populate('supplier', 'companyName')
      .sort({ stockQuantity: 1 });

    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stockQuantity <= p.lowStockThreshold).length;
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length;

    res.json({
      success: true,
      summary: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts
      },
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product stock
 * @route   PUT /api/inventory/:id/stock
 * @access  Private/Admin/Supplier
 */
export const updateStock = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // If user is a supplier, verify they own this product
    if (req.user.role === 'supplier') {
      const supplierRecord = await Supplier.findOne({ userId: req.user._id });
      if (!supplierRecord) {
        return res.status(403).json({
          success: false,
          message: 'Supplier record not found'
        });
      }

      // Check if product belongs to this supplier
      if (product.supplier.toString() !== supplierRecord._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update stock for your own products'
        });
      }
    }

    const { quantity, operation = 'set' } = req.body;

    if (operation === 'add') {
      product.stockQuantity += quantity;
    } else {
      product.stockQuantity = quantity;
    }

    await product.save();
    await product.populate('supplier', 'companyName');

    res.json({
      success: true,
      data: product,
      message: `Stock ${operation === 'add' ? 'updated' : 'set'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low stock alerts
 * @route   GET /api/inventory/alerts
 * @access  Private
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const filter = {
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] }
    };

    // If user is a supplier, only show their own products
    if (req.user.role === 'supplier') {
      const supplierRecord = await Supplier.findOne({ userId: req.user._id });
      if (!supplierRecord) {
        return res.status(403).json({
          success: false,
          message: 'Supplier record not found'
        });
      }
      filter.supplier = supplierRecord._id;
    }

    const products = await Product.find(filter)
      .populate('supplier', 'companyName')
      .sort({ stockQuantity: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

