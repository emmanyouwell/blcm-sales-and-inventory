import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as salesController from '../controllers/sales.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/sales
 * @desc    Get all sales
 * @access  Private
 */
router.get('/', salesController.getSales);

/**
 * @route   POST /api/sales
 * @desc    Create new sale (Supplier/Staff)
 * @access  Private/Supplier/Staff
 */
router.post('/', authorize('supplier', 'staff', 'admin'), [
  body('customerName').optional().trim(),
  body('customerEmail').optional().isEmail().withMessage('Please provide a valid email'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('paymentMethod').isIn(['cash', 'card', 'mobile_payment', 'other']).withMessage('Invalid payment method'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount cannot be negative'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Tax cannot be negative'),
  handleValidationErrors
], salesController.createSale);

/**
 * @route   PATCH /api/sales/:id/void
 * @desc    Void a sale (Admin/Staff)
 * @access  Private/Admin/Staff
 */
router.patch('/:id/void', authorize('admin', 'staff'), salesController.voidSale);

/**
 * @route   GET /api/sales/:id
 * @desc    Get single sale
 * @access  Private
 */
router.get('/:id', salesController.getSale);

export default router;

