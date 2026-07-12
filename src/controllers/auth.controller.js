const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Helper: generate JWT ──────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// ─── Helper: generate 4-digit OTP ─────────────────────────────────────────
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─── Helper: send OTP via Twilio ──────────────────────────────────────────
const sendOTP = async (phone, otp) => {
  // In development, just log it. Swap this for real Twilio in production.
  console.log(`📱 OTP for ${phone}: ${otp}`);

  // Production Twilio code (uncomment when ready):
  // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({
  //   body: `Your RescueRide verification code is: ${otp}`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone,
  // });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/send-otp
// @desc    Send 4-digit OTP to phone number
// @body    { phone, role }  → role: 'customer' | 'rescuer'
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (!phone || !role) {
      return res.status(400).json({ success: false, message: 'Phone and role are required' });
    }

    if (!['customer', 'rescuer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be customer or rescuer' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRES_IN || 5) * 60 * 1000);

    // Upsert: create user if first time, update OTP if returning
    let user = await User.findOneAndUpdate(
  { phone },
  { 
    phone, 
    role, 
    otp, 
    otpExpiry,
    accountStatus: role === 'customer' ? 'approved' : 'pending'
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
    await sendOTP(phone, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      // Return OTP in dev mode so you can test without Twilio
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    console.error('sendOtp error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/verify-otp
// @desc    Verify OTP — returns JWT + isNewUser flag
// @body    { phone, otp }
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please request OTP first.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Mark verified, clear OTP
    const isNewUser = !user.isVerified;
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      isNewUser,        // Flutter uses this to decide: go to /registration or /dashboard
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    console.error('verifyOtp error:', error);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Complete profile after OTP verify (name + email)
// @body    { name, email }
// @access  Protected (JWT required)
// ─────────────────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true }
    ).select('-otp -otpExpiry');

    res.status(200).json({
      success: true,
      message: 'Profile registered successfully',
      user,
    });
  } catch (error) {
    console.error('register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get logged-in user profile
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-otp -otpExpiry');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};
