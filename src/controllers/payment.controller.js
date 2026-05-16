const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/payments/create-intent
// @desc    Create a Stripe payment intent for a completed request
// @body    { requestId }
// @access  Protected — customer only
// ─────────────────────────────────────────────────────────────────────────────
exports.createPaymentIntent = async (req, res) => {
  try {
    const { requestId } = req.body;
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const request = await ServiceRequest.findOne({
      _id: requestId,
      customer: req.user._id,
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const amount = (request.finalFare || request.offeredFare) * 100; // Stripe uses smallest unit

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'pkr',
      metadata: { requestId: requestId.toString(), customerId: req.user._id.toString() },
    });

    await Payment.create({
      request: requestId,
      customer: req.user._id,
      rescuer: request.rescuer,
      amount: request.finalFare || request.offeredFare,
      stripePaymentIntentId: paymentIntent.id,
      method: 'card',
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('createPaymentIntent error:', error);
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/payments/cash
// @desc    Record a cash payment (no Stripe needed)
// @body    { requestId }
// @access  Protected — rescuer only
// ─────────────────────────────────────────────────────────────────────────────
exports.recordCashPayment = async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await ServiceRequest.findOne({
      _id: requestId,
      rescuer: req.user._id,
      status: 'completed',
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Completed request not found' });
    }

    const payment = await Payment.create({
      request: requestId,
      customer: request.customer,
      rescuer: req.user._id,
      amount: request.finalFare || request.offeredFare,
      method: 'cash',
      status: 'succeeded',
    });

    res.status(201).json({ success: true, message: 'Cash payment recorded', payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};
