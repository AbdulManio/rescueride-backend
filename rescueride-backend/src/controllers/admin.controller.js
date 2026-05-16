const { notifyAccountApproved, notifyAccountRejected } = require('../services/notification.service');
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/admin/rescuers/pending
// @desc    Get all rescuers pending approval
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.getPendingRescuers = async (req, res) => {
  try {
    const rescuers = await User.find({
      role: 'rescuer',
      accountStatus: 'pending',
    }).select('name phone email cnicPhoto licensePhoto services isShopOwner createdAt');

    res.status(200).json({ success: true, count: rescuers.length, rescuers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending rescuers' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/admin/rescuers/:id/approve
// @desc    Approve a rescuer account
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.approveRescuer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'approved' },
      { new: true }
    ).select('name phone accountStatus');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Rescuer not found' });
    }

    // Notify rescuer via socket
    const io = req.app.get('io');
    io.emitToUser(user._id.toString(), 'account:approved', {
      message: 'Your account has been approved! You can now go online.',
    });

    res.status(200).json({
      success: true,
      message: `${user.name} has been approved`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve rescuer' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/admin/rescuers/:id/reject
// @desc    Reject a rescuer account
// @body    { reason }
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectRescuer = async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus: 'rejected' },
      { new: true }
    ).select('name phone accountStatus');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Rescuer not found' });
    }

    // Notify rescuer via socket
    const io = req.app.get('io');
    io.emitToUser(user._id.toString(), 'account:rejected', {
      message: reason || 'Your account has been rejected. Please resubmit your documents.',
    });

    res.status(200).json({
      success: true,
      message: `${user.name} has been rejected`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject rescuer' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/admin/stats
// @desc    Get overall app statistics
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalRescuers,
      pendingRescuers,
      approvedRescuers,
      totalRequests,
      completedRequests,
      activeRequests,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'rescuer' }),
      User.countDocuments({ role: 'rescuer', accountStatus: 'pending' }),
      User.countDocuments({ role: 'rescuer', accountStatus: 'approved' }),
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ status: 'completed' }),
      ServiceRequest.countDocuments({ status: { $in: ['searching', 'negotiating', 'accepted', 'in_progress'] } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users: { totalCustomers, totalRescuers, pendingRescuers, approvedRescuers },
        requests: { totalRequests, completedRequests, activeRequests },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/admin/users
// @desc    Get all users with filters
// @query   role, accountStatus, page, limit
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, accountStatus, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (accountStatus) filter.accountStatus = accountStatus;

    const users = await User.find(filter)
      .select('-otp -otpExpiry')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};
