# Inventory & Data Management System

REST API for managing a product catalogue. **Stack:** Node.js, Express, MongoDB, Mongoose, dotenv (nothing else).

## Setup
```bash
npm install
cp .env.example .env      # set MONGO_URI (local MongoDB or Atlas)
npm run seed              # optional: sample data
npm start                 # http://localhost:5000
```

## Project structure
```
server.js                    entry: dotenv, DB connect, listen
src/app.js                   express app, routes, error middleware
src/config/db.js             Mongoose connection
src/models/Product.js        schema + validation + virtual stockStatus
src/controllers/             productController (CRUD, stock) / reportController (aggregations)
src/routes/                  productRoutes / reportRoutes
src/middleware/              errorHandler, validateObjectId, validateStockBody
src/utils/                   AppError, asyncHandler, queryBuilder
src/seed.js                  sample data
requests.http                ready-to-run sample requests
```

## Endpoints
| Method | URL | Description |
|---|---|---|
| POST | `/api/products` | Create product |
| GET | `/api/products` | List with filtering, sorting, pagination |
| GET | `/api/products/:id` | Get one |
| PUT/PATCH | `/api/products/:id` | Update details |
| PATCH | `/api/products/:id/restock` | `{ "quantity": n }` atomic `$inc` |
| PATCH | `/api/products/:id/sell` | `{ "quantity": n }` atomic, fails if stock insufficient |
| DELETE | `/api/products/:id` | Delete |
| GET | `/api/reports/low-stock` | Products with `quantity <= reorderLevel` (override: `?threshold=n`) |
| GET | `/api/reports/category-summary` | Aggregation: count, units, stock value, avg/min/max price, low-stock count per category |

### List query parameters
`category`, `supplier`, `search` (name/sku/description), `minPrice`, `maxPrice`, `inStock=true|false`, `isActive`,
`sort` (e.g. `-price,name`), `fields` (e.g. `name,price`), `page` (default 1), `limit` (default 10, max 100).

## Schema (Product)
`name` (2-100), `sku` (unique, uppercase, 3-20 of A-Z0-9-), `description`, `category` (lowercased), `price` (>= 0),
`quantity` (integer >= 0), `reorderLevel` (integer >= 0, default 10), `supplier`, `isActive`, timestamps.
Virtual `stockStatus`: `in-stock` / `low-stock` / `out-of-stock`.

## Design notes
- **Safe stock changes:** sale uses one conditional `findOneAndUpdate({quantity: {$gte: n}}, {$inc: {quantity: -n}})`,
  so concurrent sales can never drive stock negative (tested: 20 parallel sales on 3 units -> 3 succeed, 17 rejected).
- **Centralized errors:** one error middleware maps Mongoose validation (400), bad ids/casts (400), duplicate SKU (409),
  malformed JSON (400), unknown routes (404) to a consistent `{ success: false, message, errors? }` shape.
- **Security:** query params are whitelisted (no operator injection), regex input escaped, body fields whitelisted,
  secrets in `.env` (git-ignored).
