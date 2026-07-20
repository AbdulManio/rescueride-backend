const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/profile
// @desc    Update basic profile (name, email, vehicleInfo)
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, vehicleInfo } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (vehicleInfo) updateData.vehicleInfo = vehicleInfo;

    if (req.file) {
      updateData.profilePhoto = req.file.path;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    }).select('-otp -otpExpiry');

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/users/upload-documents
// @desc    Rescuer uploads CNIC and License photos to Cloudinary
// @files   cnicPhoto, licensePhoto (multipart/form-data)
// @access  Protected — rescuer only
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadDocuments = async (req, res) => {
  try {
    const files = req.files;

    if (!files || (!files.cnicPhoto && !files.licensePhoto)) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one document',
      });
    }

    const updateData = {};
    if (files.cnicPhoto && files.cnicPhoto[0]) {
      updateData.cnicPhoto = files.cnicPhoto[0].path;
    }
    if (files.licensePhoto && files.licensePhoto[0]) {
      updateData.licensePhoto = files.licensePhoto[0].path;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    }).select('-otp -otpExpiry');

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      cnicPhoto: user.cnicPhoto,
      licensePhoto: user.licensePhoto,
    });
  } catch (error) {
    console.error('uploadDocuments error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload documents' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/rescuer-setup
// @desc    Rescuer completes profile setup
// @body    { services, isShopOwner, vehicleInfo }
// @access  Protected — rescuer only
// ─────────────────────────────────────────────────────────────────────────────
exports.rescuerSetup = async (req, res) => {
  try {
    const { services, isShopOwner, vehicleInfo } = req.body;

    const currentUser = await User.findById(req.user._id);
    if (!currentUser.cnicPhoto || !currentUser.licensePhoto) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your CNIC and License photos first',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        services: services || [],
        isShopOwner: isShopOwner || false,
        vehicleInfo: vehicleInfo || '',
        accountStatus: currentUser.accountStatus === 'approved' ? 'approved' : 'pending',
      },
      { new: true }
    ).select('-otp -otpExpiry');

    res.status(200).json({
      success: true,
      message: 'Profile submitted! Awaiting admin approval.',
      user,
    });
  } catch (error) {
    console.error('rescuerSetup error:', error);
    res.status(500).json({ success: false, message: 'Profile setup failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/users/location
// @desc    Update user GPS location
// @body    { lat, lng }
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
    });

    res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PATCH /api/users/toggle-online
// @desc    Rescuer toggles online/offline
// @body    { isOnline }
// @access  Protected — rescuer only
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleOnline = async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (req.user.accountStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. You cannot go online yet.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isOnline },
      { new: true }
    ).select('-otp -otpExpiry');

    res.status(200).json({
      success: true,
      message: `You are now ${isOnline ? 'online 🟢' : 'offline 🔴'}`,
      isOnline: user.isOnline,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle status' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/users/earnings
// @desc    Get rescuer earnings summary
// @access  Protected — rescuer only
// ─────────────────────────────────────────────────────────────────────────────
exports.getEarnings = async (req, res) => {
  try {
    const ServiceRequest = require('../models/ServiceRequest');

    const completedJobs = await ServiceRequest.find({
      rescuer: req.user._id,
      status: 'completed',
    })
      .select('finalFare offeredFare completedAt problemType')
      .sort({ completedAt: -1 });

    const totalEarnings = completedJobs.reduce(
      (sum, job) => sum + (job.finalFare || job.offeredFare || 0), 0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayJobs = completedJobs.filter(
      (job) => job.completedAt && new Date(job.completedAt) >= today
    );
    const todayEarnings = todayJobs.reduce(
      (sum, job) => sum + (job.finalFare || job.offeredFare || 0), 0
    );

    res.status(200).json({
      success: true,
      totalEarnings,
      todayEarnings,
      totalJobs: completedJobs.length,
      todayJobs: todayJobs.length,
      jobs: completedJobs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch earnings' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/users/account-status
// @desc    Get rescuer account approval status
// @access  Protected — rescuer only
// ─────────────────────────────────────────────────────────────────────────────
exports.getAccountStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'accountStatus cnicPhoto licensePhoto services isShopOwner name phone'
    );

    res.status(200).json({
      success: true,
      accountStatus: user.accountStatus,
      hasDocuments: !!(user.cnicPhoto && user.licensePhoto),
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch account status' });
  }
};
