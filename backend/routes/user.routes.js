import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', authorize('admin'), userController.getUsers);

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin only)
 * @access  Private/Admin
 */
router.post('/', authorize('admin'), [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d+$/)
    .withMessage('Phone number must contain only digits')
    .isLength({ max: 11 })
    .withMessage('Phone number must not exceed 11 digits'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('role').isIn(['admin', 'staff', 'supplier']).withMessage('Invalid role'),
  handleValidationErrors
], userController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authorize('admin'), [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .matches(/^\d+$/)
    .withMessage('Phone number must contain only digits')
    .isLength({ max: 11 })
    .withMessage('Phone number must not exceed 11 digits'),
  body('role').optional().isIn(['admin', 'staff', 'supplier']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  handleValidationErrors
], userController.updateUser);

export default router;

