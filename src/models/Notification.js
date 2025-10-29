const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['bid_received', 'outbid', 'auction_won', 'auction_lost', 'auction_ending_soon', 'auction_approved', 'auction_rejected', 'payment_required'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction'
  },
  bid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for performance
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);