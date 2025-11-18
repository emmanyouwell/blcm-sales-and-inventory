import Product from '../models/Product.model.js';
import Supplier from '../models/Supplier.model.js';

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Private
 */
export const getProducts = async (req, res, next) => {
  try {
    const { category, supplier, lowStock, isActive } = req.query;
    const filter = {};

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
    } else if (supplier) {
      filter.supplier = supplier;
    }

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }

    const products = await Product.find(filter)
      .populate('supplier', 'companyName')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Private
 */
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin/Supplier
 */
export const createProduct = async (req, res, next) => {
  try {
    let supplierId = req.body.supplier;

    // If user is a supplier, auto-set their supplier record
    if (req.user.role === 'supplier') {
      const supplierRecord = await Supplier.findOne({ userId: req.user._id });
      if (!supplierRecord) {
        return res.status(403).json({
          success: false,
          message: 'Supplier record not found'
        });
      }
      supplierId = supplierRecord._id;
    }

    // Verify supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const productData = {
      ...req.body,
      supplier: supplierId
    };

    const product = await Product.create(productData);
    await product.populate('supplier', 'companyName');

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin/Supplier
 */
export const updateProduct = async (req, res, next) => {
  try {
    // First, get the product to check ownership
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
          message: 'You can only edit your own products'
        });
      }

      // Prevent suppliers from changing the supplier field
      delete req.body.supplier;
    } else if (req.body.supplier) {
      // For admins, verify supplier exists if they're trying to change it
      const supplier = await Supplier.findById(req.body.supplier);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplier', 'companyName');

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

