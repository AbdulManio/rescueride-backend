const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    enum: ['user', 'admin'],
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
