const SupportMessage = require('../models/SupportMessage');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/support/send
// @desc    User sends a support message
// @body    { message }
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const msg = await SupportMessage.create({
      user: req.user._id,
      message,
      sender: 'user',
    });

    // Notify admin via socket
    const io = req.app.get('io');
    io.emit('support:new-message', {
      userId: req.user._id,
      userName: req.user.name,
      userPhone: req.user.phone,
      message,
      msgId: msg._id,
      createdAt: msg.createdAt,
    });

    res.status(201).json({ success: true, msg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/support/messages
// @desc    Get support messages for current user
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .limit(100);
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/support/reply/:userId
// @desc    Admin replies to a user
// @body    { message }
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.adminReply = async (req, res) => {
  try {
    const { message } = req.body;
    const { userId } = req.params;

    const msg = await SupportMessage.create({
      user: userId,
      message,
      sender: 'admin',
    });

    // Notify user via socket
    const io = req.app.get('io');
    io.emitToUser(userId, 'support:reply', {
      message,
      createdAt: msg.createdAt,
    });

    res.status(201).json({ success: true, msg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/support/all-chats
// @desc    Admin gets all user support chats
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllChats = async (req, res) => {
  try {
    const chats = await SupportMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$user',
          lastMessage: { $first: '$message' },
          lastSender: { $first: '$sender' },
          lastTime: { $first: '$createdAt' },
          unread: {
            $sum: { $cond: [{ $eq: ['$sender', 'user'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $sort: { lastTime: -1 } }
    ]);

    res.status(200).json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/support/chat/:userId
// @desc    Admin gets full chat with a specific user
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.getUserChat = async (req, res) => {
  try {
    const messages = await SupportMessage.find({ user: req.params.userId })
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch chat' });
  }
};
