import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as supplierController from '../controllers/supplier.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers
 * @access  Private
 */
router.get('/', supplierController.getSuppliers);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get single supplier
 * @access  Private
 */
router.get('/:id', supplierController.getSupplier);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier (Admin only)
 * @access  Private/Admin
 */
router.post('/', authorize('admin'), [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('contactDetails').trim().notEmpty().withMessage('Contact details are required'),
  handleValidationErrors
], supplierController.createSupplier);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authorize('admin'), [
  body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
  body('contactDetails').optional().trim().notEmpty().withMessage('Contact details cannot be empty'),
  handleValidationErrors
], supplierController.updateSupplier);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authorize('admin'), supplierController.deleteSupplier);

export default router;

