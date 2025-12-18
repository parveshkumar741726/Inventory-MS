const express = require('express');
const router = express.Router();
const {
  getVendorLedger,
  getAllLedgers,
} = require('../controllers/ledgerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAllLedgers);
router.get('/vendor/:vendorId', getVendorLedger);

module.exports = router;
