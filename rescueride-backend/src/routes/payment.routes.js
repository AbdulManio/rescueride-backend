const express = require('express');
const router = express.Router();
const { createPaymentIntent, recordCashPayment } = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.post('/create-intent', protect, restrictTo('customer'), createPaymentIntent);
router.post('/cash',          protect, restrictTo('rescuer'),  recordCashPayment);

module.exports = router;
