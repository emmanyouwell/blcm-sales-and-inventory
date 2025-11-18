import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../utils/validationHandler.js';
import * as inventoryController from '../controllers/inventory.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/inventory
 * @desc    Get inventory status
 * @access  Private
 */
router.get('/', inventoryController.getInventory);

/**
 * @route   PUT /api/inventory/:id/stock
 * @desc    Update product stock (Admin or Supplier - suppliers can only update their own)
 * @access  Private/Admin/Supplier
 */
router.put('/:id/stock', authorize('admin', 'supplier'), [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('operation').optional().isIn(['add', 'set']).withMessage('Operation must be "add" or "set"'),
  handleValidationErrors
], inventoryController.updateStock);

/**
 * @route   GET /api/inventory/alerts
 * @desc    Get low stock alerts
 * @access  Private
 */
router.get('/alerts', inventoryController.getLowStockAlerts);

export default router;

