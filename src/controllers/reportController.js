const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


// GET /api/reports/low-stock?threshold=
// Products whose quantity is at/below their own reorderLevel (or a global ?threshold override).
exports.lowStockReport = asyncHandler(async (req, res) => {
  let thresholdExpr = '$reorderLevel';
  if (req.query.threshold !== undefined) {
    const t = Number(req.query.threshold);
    if (req.query.threshold === '' || !Number.isFinite(t) || t < 0) {
      throw new AppError('threshold must be a non-negative number', 400);
    }
    thresholdExpr = t;
  }

  const items = await Product.aggregate([
    { $match: { isActive: true, $expr: { $lte: ['$quantity', thresholdExpr] } } },
    {
      $project: {
        name: 1,
        sku: 1,
        category: 1,
        supplier: 1,
        quantity: 1,
        reorderLevel: 1,
        shortage: { $max: [0, { $subtract: [thresholdExpr, '$quantity'] }] },
        status: { $cond: [{ $eq: ['$quantity', 0] }, 'out-of-stock', 'low-stock'] },
      },
    },
    { $sort: { quantity: 1, name: 1 } },
  ]);

  res.json({
    success: true,
    count: items.length,
    outOfStock: items.filter((i) => i.status === 'out-of-stock').length,
    data: items,
  });
});

// GET /api/reports/category-summary
exports.categorySummary = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalProducts: { $sum: 1 },
        totalUnits: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        lowStockCount: { $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        totalProducts: 1,
        totalUnits: 1,
        totalValue: { $round: ['$totalValue', 2] },
        avgPrice: { $round: ['$avgPrice', 2] },
        minPrice: 1,
        maxPrice: 1,
        lowStockCount: 1,
      },
    },
    { $sort: { totalValue: -1 } },
  ]);

  const overall = categories.reduce(
    (acc, c) => ({
      totalCategories: acc.totalCategories + 1,
      totalProducts: acc.totalProducts + c.totalProducts,
      totalUnits: acc.totalUnits + c.totalUnits,
      totalValue: Math.round((acc.totalValue + c.totalValue) * 100) / 100,
    }),
    { totalCategories: 0, totalProducts: 0, totalUnits: 0, totalValue: 0 }
  );

  res.json({ success: true, overall, data: categories });
});
