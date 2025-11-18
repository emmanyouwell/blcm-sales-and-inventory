import Supplier from '../models/Supplier.model.js';
import User from '../models/User.model.js';

/**
 * @desc    Get all suppliers
 * @route   GET /api/suppliers
 * @access  Private
 */
export const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find()
      .populate('userId', 'username role isActive')
      .sort({ companyName: 1 });
    
    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single supplier
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
export const getSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('userId', 'username role isActive');
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new supplier
 * @route   POST /api/suppliers
 * @access  Private/Admin
 */
export const createSupplier = async (req, res, next) => {
  try {
    const { username, password, firstName, lastName, email, phone, companyName, contactDetails } = req.body;

    // Check if username or email already exists
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: userExists.username === username 
          ? 'Username already exists' 
          : 'Email already exists'
      });
    }

    // Create user account for supplier
    const user = await User.create({
      username,
      password,
      firstName,
      lastName,
      email,
      phone,
      role: 'supplier'
    });

    // Create supplier record
    const supplier = await Supplier.create({
      companyName,
      contactDetails,
      userId: user._id
    });

    // Populate user data in response
    await supplier.populate('userId', 'username firstName lastName email phone role isActive');

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private/Admin
 */
export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private/Admin
 */
export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Delete associated user account
    await User.findByIdAndDelete(supplier.userId);

    // Delete supplier record
    await Supplier.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

