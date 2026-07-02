const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const {
  sendMessage,
  getMyMessages,
  adminReply,
  getAllChats,
  getUserChat,
} = require('../controllers/support.controller');

// User routes
router.post('/send',          protect, sendMessage);
router.get('/messages',       protect, getMyMessages);

// Admin routes
router.get('/all-chats',      adminOnly, getAllChats);
router.get('/chat/:userId',   adminOnly, getUserChat);
router.post('/reply/:userId', adminOnly, adminReply);

module.exports = router;
