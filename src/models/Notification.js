const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: {
    type: String,
    enum: ['new_offer', 'offer_accepted', 'new_request', 'job_completed', 'account_approved', 'account_rejected'],
  },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);