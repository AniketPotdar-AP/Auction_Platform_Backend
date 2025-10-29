const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Clothing', 'Accessories', 'Vehicles', 'Art', 'Collectibles', 'Electronics']
  },
  subcategory: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
    required: [true, 'Condition is required']
  },
  images: [{
    type: String,
    required: true
  }],
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Base price cannot be negative']
  },
  currentBid: {
    type: Number,
    default: 0
  },
  reservePrice: {
    type: Number,
    min: [0, 'Reserve price cannot be negative']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    default: Date.now
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  }],
  location: {
    type: String,
    trim: true
  },
  shippingInfo: {
    type: String,
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for search
auctionSchema.index({ title: 'text', description: 'text', tags: 'text' });
auctionSchema.index({ category: 1, status: 1, endTime: 1 });
auctionSchema.index({ seller: 1 });

// Virtual for time remaining
auctionSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.endTime);
  return Math.max(0, end - now);
});

// Virtual for isActive
auctionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startTime && now <= this.endTime;
});

// Ensure virtual fields are serialized
auctionSchema.set('toJSON', { virtuals: true });
auctionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Auction', auctionSchema);