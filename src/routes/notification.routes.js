const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/notifications/fcm-token
// @desc    Save FCM token for push notifications
// @body    { fcmToken }
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'fcmToken is required' });
    }

    await User.findByIdAndUpdate(req.user._id, { fcmToken });

    res.status(200).json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save FCM token' });
  }
});

module.exports = router;
