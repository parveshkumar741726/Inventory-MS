const express = require('express');
const router = express.Router();
const {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  getVendorStats,
} = require('../controllers/vendorController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getVendors)
  .post(createVendor);

router.get('/stats', getVendorStats);

router.route('/:id')
  .get(getVendor)
  .put(updateVendor)
  .delete(deleteVendor);

module.exports = router;
