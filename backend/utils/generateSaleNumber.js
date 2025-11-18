import Sale from '../models/Sale.model.js';

/**
 * Generate unique sale number
 */
export const generateSaleNumber = async () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Sale.countDocuments({
    createdAt: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999))
    }
  });
  return `SALE-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

