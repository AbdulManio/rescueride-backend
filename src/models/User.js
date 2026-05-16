const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['customer', 'rescuer'],
      required: true,
    },
    profilePhoto: {
      type: String, // Cloudinary URL
      default: null,
    },

    // ─── OTP Auth ────────────────────────────────────────────────────────────
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // ─── Location (GeoJSON for $near queries) ────────────────────────────────
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // ─── Rescuer-specific fields ─────────────────────────────────────────────
    isOnline: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    services: {
      type: [String], // ['puncture', 'fuel', 'towing', 'battery', 'lockout']
      default: [],
    },
    isShopOwner: {
      type: Boolean,
      default: false,
    },
    cnicPhoto: {
      type: String, // Cloudinary URL
      default: null,
    },
    licensePhoto: {
      type: String, // Cloudinary URL
      default: null,
    },
    vehicleInfo: {
      type: String,
      default: null,
    },

    // ─── Ratings ─────────────────────────────────────────────────────────────
    rating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },

    // ─── FCM Token
    fcmToken: { type: String, default: null },

    // ─── Earnings (rescuer only) ──────────────────────────────────────────────
    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for geospatial queries (finding nearby rescuers)
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
