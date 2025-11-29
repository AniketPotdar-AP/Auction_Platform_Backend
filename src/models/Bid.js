const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Bid amount is required'],
    min: [1, 'Bid amount must be at least 1'],
    validate: {
      validator: function (value) {
        return Number.isInteger(value);
      },
      message: 'Bid amount must be a whole number'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isWinning: {
    type: Boolean,
    default: false
  },
  isOutbid: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for performance
bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ bidder: 1 });

// Validate bid amount is higher than current highest bid
bidSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Auction = mongoose.model('Auction');
    const auction = await Auction.findById(this.auction);

    if (!auction) {
      return next(new Error('Auction not found'));
    }

    if (auction.status !== 'active') {
      return next(new Error('Auction is not active'));
    }

    if (auction.seller.toString() === this.bidder.toString()) {
      return next(new Error('Sellers cannot bid on their own auctions'));
    }

    // Check if bid meets minimum auction amount requirement
    if (this.amount < auction.minAuctionAmount) {
      return next(new Error(`Bid must be at least the minimum auction amount of $${auction.minAuctionAmount}`));
    }

    // Update auction's currentBid to the highest bid
    const highestBid = await this.constructor.findOne({ auction: this.auction })
      .sort({ amount: -1 })
      .limit(1);

    if (highestBid) {
      auction.currentBid = highestBid.amount;
      await auction.save();
    }
  }

  next();
});

module.exports = mongoose.model('Bid', bidSchema);