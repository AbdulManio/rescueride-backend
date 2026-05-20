const { notifyNewRequest, notifyJobCompleted } = require('../services/notification.service');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const Offer = require('../models/Offer');

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/services/request
// @desc    Customer creates a new service request
// @body    { problemType, description, offeredFare, lat, lng, address }
// @access  Protected — customer only
// ─────────────────────────────────────────────────────────────────────────────
exports.createRequest = async (req, res) => {
  try {
    const { problemType, description, offeredFare, lat, lng, address } = req.body;

    if (!problemType || !offeredFare || !lat || !lng) {
      return res.status(400).json({ success: false, message: 'problemType, offeredFare, lat, lng are required' });
    }

    if (offeredFare < 500) {
      return res.status(400).json({ success: false, message: 'Minimum fare is 500 PKR' });
    }

    // Cancel any existing open request from this customer
    await ServiceRequest.updateMany(
      { customer: req.user._id, status: { $in: ['searching', 'negotiating'] } },
      { status: 'cancelled' }
    );

    const request = await ServiceRequest.create({
      customer: req.user._id,
      problemType,
      description: description || '',
      offeredFare,
      location: {
        type: 'Point',
        coordinates: [lng, lat], // GeoJSON: [longitude, latitude]
        address: address || '',
      },
    });

    // Notify nearby online rescuers via Socket.io
    const io = req.app.get('io');
    const nearbyRescuers = await User.find({
      role: 'rescuer',
      isOnline: true,
      accountStatus: 'approved',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 10000, // 10km radius
        },
      },
    }).select('_id');

    nearbyRescuers.forEach((rescuer) => {
      io.emitToUser(rescuer._id.toString(), 'new:request', {
        requestId: request._id,
        problemType,
        offeredFare,
        address,
        lat,
        lng,
      });
    });

    res.status(201).json({
      success: true,
      message: 'Request created. Searching for nearby rescuers...',
      request,
    });
  } catch (error) {
    console.error('createRequest error:', error);
    res.status(500).json({ success: false, message: 'Failed to create request' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/services/my-requests
// @desc    Get customer's request history
// @access  Protected — customer only
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ customer: req.user._id })
      .populate('rescuer', 'name phone rating profilePhoto')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/services/active
// @desc    Get current active request for customer
// @access  Protected — customer only
// ─────────────────────────────────────────────────────────────────────────────
exports.getActiveRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({
      customer: req.user._id,
      status: { $in: ['searching', 'negotiating', 'accepted', 'in_progress'] },
    }).populate('rescuer', 'name phone rating profilePhoto location');

    res.status(200).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active request' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/services/:id/cancel
// @desc    Customer cancels a request
// @access  Protected — customer only
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({
      _id: req.params.id,
      customer: req.user._id,
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this request' });
    }

    request.status = 'cancelled';
    await request.save();

    // Notify rescuer if one was assigned
    if (request.rescuer) {
      const io = req.app.get('io');
      io.emitToUser(request.rescuer.toString(), 'request:cancelled', {
        requestId: request._id,
      });
    }

    res.status(200).json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel request' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/services/:id/complete
// @desc    Rescuer marks job as complete
// @access  Protected — rescuer only
// ─────────────────────────────────────────────────────────────────────────────
exports.completeRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findOne({
      _id: req.params.id,
      rescuer: req.user._id,
      status: 'in_progress',
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Active request not found' });
    }

    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    // Update rescuer earnings
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalEarnings: request.finalFare || request.offeredFare },
    });

    // Notify customer to open the rating screen
    const io = req.app.get('io');
    io.emitToUser(request.customer.toString(), 'request:completed', {
      requestId: request._id,
      rescuerId: req.user._id,
    });

    res.status(200).json({ success: true, message: 'Job marked as complete', request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to complete request' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/services/nearby-rescuers
// @desc    Get online approved rescuers near a location
// @query   lat, lng, radius (meters, default 10000)
// @access  Protected — customer only
// ─────────────────────────────────────────────────────────────────────────────
exports.getNearbyRescuers = async (req, res) => {
  try {
    const { lat, lng, radius = 10000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const rescuers = await User.find({
      role: 'rescuer',
      isOnline: true,
      accountStatus: 'approved',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    }).select('name rating services profilePhoto location');

    res.status(200).json({ success: true, rescuers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch nearby rescuers' });
  }
};
exports.getRescuerRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({
      rescuer: req.user._id,
      status: { $in: ['accepted', 'in_progress'] },
    }).populate('customer', 'name phone');
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
};