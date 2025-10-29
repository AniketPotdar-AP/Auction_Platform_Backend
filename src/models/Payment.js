const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Payment amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'razorpay'],
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentIntentId: {
    type: String
  },
  description: {
    type: String,
    default: 'Auction payment'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for performance
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ auction: 1 });
paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);