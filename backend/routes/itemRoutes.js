const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  getItem,
  updateItem,
  getLowStockItems,
} = require('../controllers/itemController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getItems)
  .post(createItem);

router.get('/low-stock', getLowStockItems);

router.route('/:id')
  .get(getItem)
  .put(updateItem);

module.exports = router;
