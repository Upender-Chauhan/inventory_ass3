const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// Converts known library errors into AppError instances.
const normalizeError = (err) => {
  if (err.isOperational) return err;

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new AppError('Validation failed', 400, details);
  }
  if (err.name === 'CastError') {
    return new AppError(`Invalid value for ${err.path}: ${err.value}`, 400);
  }
  if (err.code === 11000) {
    const field =
      Object.keys(err.keyValue || err.keyPattern || {})[0] ||
      (/index: (\w+?)_1/.exec(err.message || '') || [])[1] ||
      'value';
    return new AppError(`Duplicate value: a product with this ${field} already exists`, 409);
  }
  if (err.type === 'entity.parse.failed') {
    return new AppError('Malformed JSON in request body', 400);
  }
  return err;
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) console.error(err);

  const body = {
    success: false,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  };
  if (error.details) body.errors = error.details;
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
