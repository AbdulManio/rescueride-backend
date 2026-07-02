const { saveNotification } = require('../services/notification.service');
const Offer = require('../models/Offer');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');

exports.sendOffer = async (req, res) => {
  try {
    const { requestId, counterFare, distanceKm, etaMinutes } = req.body;

    if (!requestId || !counterFare) {
      return res.status(400).json({ success: false, message: 'requestId and counterFare are required' });
    }

    const request = await ServiceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['searching', 'negotiating'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'This request is no longer accepting offers' });
    }

    const existingOffer = await Offer.findOne({ request: requestId, rescuer: req.user._id });
    if (existingOffer) {
      return res.status(400).json({ success: false, message: 'You already sent an offer for this request' });
    }

    const offer = await Offer.create({
      request: requestId,
      rescuer: req.user._id,
      counterFare,
      distanceKm: distanceKm || null,
      etaMinutes: etaMinutes || null,
    });

    request.status = 'negotiating';
    await request.save();

    const io = req.app.get('io');
    const rescuer = await User.findById(req.user._id).select('name rating profilePhoto');

    await saveNotification(request.customer, {
      title: '🚗 New Offer Received!',
      body: `${rescuer.name} offered PKR ${counterFare} for your request`,
      type: 'new_offer',
      requestId,
    });

    io.emitToUser(request.customer.toString(), 'new:offer', {
      offerId: offer._id,
      requestId,
      rescuer: { _id: rescuer._id, name: rescuer.name, rating: rescuer.rating, profilePhoto: rescuer.profilePhoto },
      counterFare,
      distanceKm,
      etaMinutes,
    });

    res.status(201).json({ success: true, message: 'Offer sent to customer', offer });
  } catch (error) {
    console.error('sendOffer error:', error);
    res.status(500).json({ success: false, message: 'Failed to send offer' });
  }
};

exports.getOffersForRequest = async (req, res) => {
  try {
    const offers = await Offer.find({ request: req.params.requestId })
      .populate('rescuer', 'name phone rating profilePhoto location services')
      .sort({ counterFare: 1 });

    res.status(200).json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

exports.acceptOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId).populate('request');

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    if (offer.request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your request' });
    }

    offer.status = 'accepted';
    await offer.save();

    await Offer.updateMany(
      { request: offer.request._id, _id: { $ne: offer._id } },
      { status: 'rejected' }
    );

    const request = await ServiceRequest.findByIdAndUpdate(
      offer.request._id,
      {
        status: 'accepted',
        rescuer: offer.rescuer,
        finalFare: offer.counterFare,
        acceptedOfferId: offer._id,
      },
      { new: true }
    );

    const io = req.app.get('io');
    const customer = await User.findById(req.user._id).select('name');

    await saveNotification(offer.rescuer, {
      title: '✅ Offer Accepted!',
      body: `${customer.name || 'Customer'} accepted your offer of PKR ${offer.counterFare}`,
      type: 'offer_accepted',
      requestId: request._id,
    });

    io.emitToUser(offer.rescuer.toString(), 'offer:accepted', {
      requestId: request._id,
      customerLocation: request.location,
      finalFare: offer.counterFare,
    });

    const rejectedOffers = await Offer.find({
      request: offer.request._id,
      status: 'rejected',
    }).select('rescuer');

    rejectedOffers.forEach((o) => {
      io.emitToUser(o.rescuer.toString(), 'offer:rejected', {
        requestId: request._id,
      });
    });

    res.status(200).json({
      success: true,
      message: 'Offer accepted! Rescuer is on the way.',
      request,
    });
  } catch (error) {
    console.error('acceptOffer error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept offer' });
  }
};
