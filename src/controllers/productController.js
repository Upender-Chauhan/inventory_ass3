const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { buildProductQuery } = require('../utils/queryBuilder');

// Only these fields may be set by clients (blocks mass-assignment of _id, timestamps, etc.).
const WRITABLE = ['name', 'sku', 'description', 'category', 'price', 'quantity', 'reorderLevel', 'supplier', 'isActive'];

const pickWritable = (body) => {
  const out = {};
  for (const key of WRITABLE) if (body[key] !== undefined) out[key] = body[key];
  return out;
};

const ensureBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    throw new AppError('Request body is required', 400);
  }
};

const findOr404 = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw new AppError(`Product not found with id ${id}`, 404);
  return product;
};

// POST /api/products
exports.createProduct = asyncHandler(async (req, res) => {
  ensureBody(req.body);
  const product = await Product.create(pickWritable(req.body));
  res.status(201).json({ success: true, message: 'Product created', data: product });
});

// GET /api/products?category=&minPrice=&maxPrice=&inStock=&search=&sort=&fields=&page=&limit=
exports.getProducts = asyncHandler(async (req, res) => {
  const { filter, sort, select, page, limit, skip } = buildProductQuery(req.query);

  const [products, total] = await Promise.all([
    Product.find(filter).select(select).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / limit);
  res.json({
    success: true,
    count: products.length,
    total,
    page,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
    data: products,
  });
});

// GET /api/products/:id
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await findOr404(req.params.id);
  res.json({ success: true, data: product });
});

// PUT/PATCH /api/products/:id  (validators run on the updated fields)
exports.updateProduct = asyncHandler(async (req, res) => {
  ensureBody(req.body);
  const updates = pickWritable(req.body);
  if (Object.keys(updates).length === 0) {
    throw new AppError(`No updatable fields supplied. Allowed: ${WRITABLE.join(', ')}`, 400);
  }
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!product) throw new AppError(`Product not found with id ${req.params.id}`, 404);
  res.json({ success: true, message: 'Product updated', data: product });
});

// PATCH /api/products/:id/restock  { quantity }
// Atomic $inc - safe under concurrent requests.
exports.restockProduct = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $inc: { quantity } },
    { new: true, runValidators: true }
  );
  if (!product) throw new AppError(`Product not found with id ${req.params.id}`, 404);
  res.json({ success: true, message: `Restocked ${quantity} unit(s)`, data: product });
});

// PATCH /api/products/:id/sell  { quantity }
// Single atomic conditional update: decrements only if enough stock exists,
// so two simultaneous sales can never push quantity below zero.
exports.sellProduct = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, isActive: true, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true }
  );

  if (!product) {
    const existing = await Product.findById(req.params.id).select('quantity isActive');
    if (!existing) throw new AppError(`Product not found with id ${req.params.id}`, 404);
    if (!existing.isActive) throw new AppError('Product is inactive and cannot be sold', 400);
    throw new AppError(`Insufficient stock: requested ${quantity}, available ${existing.quantity}`, 400);
  }
  res.json({ success: true, message: `Sold ${quantity} unit(s)`, data: product });
});

// DELETE /api/products/:id
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError(`Product not found with id ${req.params.id}`, 404);
  res.json({ success: true, message: 'Product deleted', data: { _id: product._id } });
});
