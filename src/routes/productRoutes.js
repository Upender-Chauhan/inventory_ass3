const express = require('express');
const c = require('../controllers/productController');
const validateObjectId = require('../middleware/validateObjectId');
const validateStockBody = require('../middleware/validateStockBody');

const router = express.Router();

router.route('/').get(c.getProducts).post(c.createProduct);

router.route('/:id')
  .all(validateObjectId)
  .get(c.getProduct)
  .put(c.updateProduct)
  .patch(c.updateProduct)
  .delete(c.deleteProduct);

router.patch('/:id/restock', validateObjectId, validateStockBody, c.restockProduct);
router.patch('/:id/sell', validateObjectId, validateStockBody, c.sellProduct);

module.exports = router;
