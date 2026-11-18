const AppError = require('../utils/AppError');

// Validates { quantity } for restock / sale operations: must be a positive integer.
module.exports = (req, res, next) => {
  const { quantity } = req.body || {};
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
    return next(new AppError('quantity must be a positive whole number', 400));
  }
  next();
};
