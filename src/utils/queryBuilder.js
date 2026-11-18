const AppError = require('./AppError');

const SORTABLE = ['name', 'price', 'quantity', 'category', 'createdAt', 'updatedAt'];
const SELECTABLE = ['name', 'sku', 'description', 'category', 'price', 'quantity', 'reorderLevel', 'supplier', 'isActive', 'createdAt', 'updatedAt'];

const toNumber = (value, label) => {
  const n = Number(value);
  if (value === '' || Number.isNaN(n)) throw new AppError(`${label} must be a number`, 400);
  return n;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds { filter, sort, select, page, limit, skip } from the query string.
 * Only whitelisted keys are used (prevents NoSQL operator injection like ?price[$gt]=0).
 *
 * Supported: category, supplier, search, minPrice, maxPrice, inStock, isActive,
 *            sort (e.g. -price,name), fields (e.g. name,price), page, limit
 */
const buildProductQuery = (q) => {
  const filter = {};

  if (typeof q.category === 'string' && q.category.trim()) {
    filter.category = q.category.trim().toLowerCase();
  }
  if (typeof q.supplier === 'string' && q.supplier.trim()) {
    filter.supplier = new RegExp(`^${escapeRegex(q.supplier.trim())}$`, 'i');
  }
  if (typeof q.search === 'string' && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim()), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { description: rx }];
  }

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.price = {};
    if (q.minPrice !== undefined) filter.price.$gte = toNumber(q.minPrice, 'minPrice');
    if (q.maxPrice !== undefined) filter.price.$lte = toNumber(q.maxPrice, 'maxPrice');
    if (filter.price.$gte !== undefined && filter.price.$lte !== undefined && filter.price.$gte > filter.price.$lte) {
      throw new AppError('minPrice cannot be greater than maxPrice', 400);
    }
  }

  if (q.inStock !== undefined) {
    if (!['true', 'false'].includes(q.inStock)) throw new AppError('inStock must be true or false', 400);
    filter.quantity = q.inStock === 'true' ? { $gt: 0 } : 0;
  }
  if (q.isActive !== undefined) {
    if (!['true', 'false'].includes(q.isActive)) throw new AppError('isActive must be true or false', 400);
    filter.isActive = q.isActive === 'true';
  }

  // Sorting: "-price,name" -> { price: -1, name: 1 }
  const sort = {};
  const sortParam = typeof q.sort === 'string' && q.sort ? q.sort : '-createdAt';
  for (const part of sortParam.split(',')) {
    const field = part.replace(/^-/, '').trim();
    if (!SORTABLE.includes(field)) {
      throw new AppError(`Cannot sort by "${field}". Allowed: ${SORTABLE.join(', ')}`, 400);
    }
    sort[field] = part.startsWith('-') ? -1 : 1;
  }

  // Field projection
  let select;
  if (typeof q.fields === 'string' && q.fields) {
    const fields = q.fields.split(',').map((f) => f.trim());
    const bad = fields.find((f) => !SELECTABLE.includes(f));
    if (bad) throw new AppError(`Cannot select "${bad}". Allowed: ${SELECTABLE.join(', ')}`, 400);
    select = fields.join(' ');
  }

  // Pagination
  const page = q.page === undefined ? 1 : toNumber(q.page, 'page');
  const limit = q.limit === undefined ? 10 : toNumber(q.limit, 'limit');
  if (!Number.isInteger(page) || page < 1) throw new AppError('page must be a positive integer', 400);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('limit must be an integer between 1 and 100', 400);
  }

  return { filter, sort, select, page, limit, skip: (page - 1) * limit };
};

module.exports = { buildProductQuery };
