// Usage: npm run seed   (clears the products collection and inserts sample data)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const products = [
  { name: 'Wireless Mouse', sku: 'ELEC-001', category: 'electronics', price: 799, quantity: 45, reorderLevel: 15, supplier: 'TechSource' },
  { name: 'Mechanical Keyboard', sku: 'ELEC-002', category: 'electronics', price: 3499, quantity: 8, reorderLevel: 10, supplier: 'TechSource' },
  { name: 'USB-C Cable', sku: 'ELEC-003', category: 'electronics', price: 299, quantity: 0, reorderLevel: 20, supplier: 'CableWorld' },
  { name: 'Notebook A5', sku: 'STAT-001', category: 'stationery', price: 60, quantity: 200, reorderLevel: 50, supplier: 'PaperPlus' },
  { name: 'Gel Pen Pack', sku: 'STAT-002', category: 'stationery', price: 120, quantity: 30, reorderLevel: 40, supplier: 'PaperPlus' },
  { name: 'Office Chair', sku: 'FURN-001', category: 'furniture', price: 6500, quantity: 12, reorderLevel: 5, supplier: 'SitWell' },
  { name: 'Standing Desk', sku: 'FURN-002', category: 'furniture', price: 18999, quantity: 3, reorderLevel: 4, supplier: 'SitWell' },
  { name: 'Water Bottle', sku: 'HOME-001', category: 'home', price: 349, quantity: 80, reorderLevel: 20, supplier: 'HomeEssentials' },
];

(async () => {
  try {
    await connectDB();
    await Product.deleteMany({});
    const created = await Product.insertMany(products);
    console.log(`Seeded ${created.length} products`);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
