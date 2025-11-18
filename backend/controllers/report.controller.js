import Sale from '../models/Sale.model.js';
import Product from '../models/Product.model.js';

/**
 * @desc    Get sales report
 * @route   GET /api/reports/sales
 * @access  Private/Admin
 */
export const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Use aggregation pipeline for better performance
    const [summaryResult, salesByDateResult, sales] = await Promise.all([
      // Calculate summary statistics
      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            isVoid: false
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            totalVAT: { $sum: '$tax' }
          }
        }
      ]),
      // Group by date
      Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            isVoid: false
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]),
      // Get sales data with populated fields (limit to recent for performance)
      Sale.find({
        createdAt: { $gte: start, $lte: end },
        isVoid: false
      })
        .populate('cashier', 'username')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .limit(100) // Limit to prevent memory issues
    ]);

    const summary = summaryResult[0] || { totalSales: 0, totalRevenue: 0, totalVAT: 0 };
    const salesByDate = {};
    salesByDateResult.forEach(item => {
      salesByDate[item._id] = { count: item.count, revenue: item.revenue };
    });

    res.json({
      success: true,
      period: { startDate, endDate },
      summary: {
        totalSales: summary.totalSales,
        totalRevenue: summary.totalRevenue,
        totalVAT: summary.totalVAT,
        averageSaleValue: summary.totalSales > 0 ? summary.totalRevenue / summary.totalSales : 0
      },
      salesByDate,
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory report
 * @route   GET /api/reports/inventory
 * @access  Private/Admin
 */
export const getInventoryReport = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('supplier', 'companyName')
      .sort({ category: 1, name: 1 });

    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0);
    const lowStockProducts = products.filter(p => p.stockQuantity <= p.lowStockThreshold);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0);

    // Group by category
    const byCategory = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!byCategory[category]) {
        byCategory[category] = { count: 0, totalValue: 0 };
      }
      byCategory[category].count += 1;
      byCategory[category].totalValue += product.price * product.stockQuantity;
    });

    res.json({
      success: true,
      summary: {
        totalProducts,
        totalStockValue,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length
      },
      byCategory,
      lowStockProducts: lowStockProducts.map(p => ({
        id: p._id,
        name: p.name,
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        supplier: p.supplier
      })),
      outOfStockProducts: outOfStockProducts.map(p => ({
        id: p._id,
        name: p.name,
        supplier: p.supplier
      })),
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get top selling products
 * @route   GET /api/reports/top-products
 * @access  Private/Admin
 */
export const getTopProducts = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const matchFilter = { isVoid: false };
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Use aggregation pipeline for better performance
    const topProducts = await Sale.aggregate([
      {
        $match: matchFilter
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          saleCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productId: '$_id',
          productName: '$product.name',
          totalQuantity: 1,
          totalRevenue: 1,
          saleCount: 1
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      success: true,
      count: topProducts.length,
      data: topProducts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue trends
 * @route   GET /api/reports/revenue-trends
 * @access  Private/Admin
 */
export const getRevenueTrends = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Determine date format based on groupBy
    let dateFormat;
    if (groupBy === 'day') {
      dateFormat = '%Y-%m-%d';
    } else if (groupBy === 'week') {
      dateFormat = '%Y-%U'; // Year-Week number
    } else if (groupBy === 'month') {
      dateFormat = '%Y-%m';
    } else {
      dateFormat = '%Y-%m-%d';
    }

    // Use aggregation pipeline for better performance
    const trendData = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          isVoid: false
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$total' },
          sales: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          revenue: 1,
          sales: 1,
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    res.json({
      success: true,
      period: { startDate, endDate, groupBy },
      data: trendData
    });
  } catch (error) {
    next(error);
  }
};

