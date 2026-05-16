const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rescuer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ─── Problem details (from CreateRequestScreen) ───────────────────────
    problemType: {
      type: String,
      required: true,
      // e.g. 'Puncture', 'Fuel Empty', 'Battery Dead', 'Towing', 'Lockout'
    },
    description: {
      type: String,
      default: '',
    },
    offeredFare: {
      type: Number,
      required: true,
      min: 500, // minimum PKR
    },
    finalFare: {
      type: Number,
      default: null, // set when customer accepts an offer
    },

    // ─── Customer location (GeoJSON) ─────────────────────────────────────
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        default: '',
      },
    },

    // ─── Request lifecycle ────────────────────────────────────────────────
    // searching     → waiting for rescuers to send offers
    // negotiating   → customer is reviewing offers
    // accepted      → customer accepted an offer
    // in_progress   → rescuer is en route / working
    // completed     → job done
    // cancelled     → cancelled by customer
    status: {
      type: String,
      enum: ['searching', 'negotiating', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'searching',
    },

    acceptedOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
