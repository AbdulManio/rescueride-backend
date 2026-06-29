const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Save FCM token
router.patch('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: 'fcmToken is required' });
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.status(200).json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save FCM token' });
  }
});

// Get all notifications for user
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark all as read
router.patch('/mark-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications' });
  }
});
const saveNotification = async (userId, { title, body, type, requestId }) => {
  try {
    await Notification.create({
      user: userId,
      title,
      body,
      type: type || 'new_offer',
      requestId: requestId || null,
    });
  } catch (error) {
    console.error('Save notification error:', error.message);
  }
};
module.exports = router;