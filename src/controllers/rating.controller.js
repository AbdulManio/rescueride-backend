const Rating = require('../models/Rating');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/ratings
// @desc    Customer submits a rating after job completion
// @body    { requestId, stars, comment }
// @access  Protected — customer only
// ─────────────────────────────────────────────────────────────────────────────
exports.submitRating = async (req, res) => {
  try {
    const { requestId, stars, comment } = req.body;

    if (!requestId || !stars) {
      return res.status(400).json({ success: false, message: 'requestId and stars are required' });
    }

    if (stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: 'Stars must be between 1 and 5' });
    }

    const request = await ServiceRequest.findOne({
      _id: requestId,
      customer: req.user._id,
      status: 'completed',
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Completed request not found' });
    }

    // Prevent duplicate ratings
    const existingRating = await Rating.findOne({ request: requestId });
    if (existingRating) {
      return res.status(400).json({ success: false, message: 'You already rated this job' });
    }

    const rating = await Rating.create({
      request: requestId,
      customer: req.user._id,
      rescuer: request.rescuer,
      stars,
      comment: comment || '',
    });

    // Update rescuer's average rating
    const allRatings = await Rating.find({ rescuer: request.rescuer });
    const avgRating = allRatings.reduce((sum, r) => sum + r.stars, 0) / allRatings.length;

    await User.findByIdAndUpdate(request.rescuer, {
      rating: Math.round(avgRating * 10) / 10,
      totalRatings: allRatings.length,
    });

    res.status(201).json({ success: true, message: 'Rating submitted. Thank you!', rating });
  } catch (error) {
    console.error('submitRating error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
};
