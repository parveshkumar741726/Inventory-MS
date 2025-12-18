const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getVendorReport,
  getPurchaseReport,
  getPaymentReport,
  getInventoryReport,
  getLedgerReport,
  getMonthlySummary,
} = require('../controllers/reportController');

router.get('/vendors', protect, getVendorReport);
router.get('/purchases', protect, getPurchaseReport);
router.get('/payments', protect, getPaymentReport);
router.get('/inventory', protect, getInventoryReport);
router.get('/ledger', protect, getLedgerReport);
router.get('/monthly-summary', protect, getMonthlySummary);

module.exports = router;
