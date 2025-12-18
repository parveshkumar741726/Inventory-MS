const express = require('express');
const router = express.Router();
const {
  createPurchase,
  getPurchases,
  getPurchase,
  getPurchaseStats,
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(upload.single('invoiceFile'), createPurchase);

router.get('/stats', getPurchaseStats);

router.route('/:id')
  .get(getPurchase);

module.exports = router;
