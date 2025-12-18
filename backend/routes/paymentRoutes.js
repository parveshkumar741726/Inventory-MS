const express = require('express');
const router = express.Router();
const {
  createPayment,
  getPayments,
  getPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.route('/:id')
  .get(getPayment);

module.exports = router;
