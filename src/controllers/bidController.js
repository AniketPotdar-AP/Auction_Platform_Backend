const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const Notification = require('../models/Notification');

// @desc    Get bids for an auction
// @route   GET /api/bids/auction/:auctionId
// @access  Public
const getBidsForAuction = async (req, res) => {
  try {
    const bids = await Bid.find({ auction: req.params.auctionId })
      .populate('bidder', 'name avatar')
      .sort({ amount: -1, createdAt: -1 });

    res.json({
      success: true,
      count: bids.length,
      data: bids
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Place a bid
// @route   POST /api/bids
// @access  Private (Authenticated users)
const placeBid = async (req, res) => {
  try {
    const { auctionId, amount } = req.body;
    const io = req.app.get('io');

    // Check if auction exists and is active
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Auction is not active'
      });
    }

    // Check if auction has ended
    if (new Date() > new Date(auction.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Auction has ended'
      });
    }

    // Check if seller is trying to bid on their own auction
    if (auction.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Sellers cannot bid on their own auctions'
      });
    }

    // Create the bid (validation happens in pre-save middleware)
    const bid = await Bid.create({
      auction: auctionId,
      bidder: req.user._id,
      amount
    });

    // Populate bidder info
    await bid.populate('bidder', 'name avatar');

    // Get all previous bids for this auction to find outbid users
    const previousBids = await Bid.find({ auction: auctionId })
      .populate('bidder', 'name email')
      .sort({ amount: -1 });

    // Find the highest bid (excluding current bid)
    const highestPreviousBid = previousBids.find(b => b._id.toString() !== bid._id.toString());

    // Notify outbid users
    if (highestPreviousBid) {
      await Notification.create({
        user: highestPreviousBid.bidder._id,
        type: 'outbid',
        title: 'You have been outbid',
        message: `Someone placed a higher bid on "${auction.title}"`,
        auction: auctionId,
        bid: bid._id
      });
    }

    // Notify seller of new bid
    await Notification.create({
      user: auction.seller,
      type: 'bid_received',
      title: 'New bid received',
      message: `A new bid of $${amount} was placed on your auction "${auction.title}"`,
      auction: auctionId,
      bid: bid._id
    });

    // Emit real-time updates via Socket.io
    io.to(auctionId).emit('newBid', {
      bid: {
        _id: bid._id,
        amount: bid.amount,
        bidder: {
          _id: bid.bidder._id,
          name: bid.bidder.name,
          avatar: bid.bidder.avatar
        },
        timestamp: bid.timestamp
      },
      currentBid: auction.currentBid,
      bidderCount: previousBids.length + 1
    });

    res.status(201).json({
      success: true,
      data: bid
    });
  } catch (error) {
    console.error(error);
    if (error.message.includes('Bid must be higher')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's bidding history
// @route   GET /api/bids/my-bids
// @access  Private
const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ bidder: req.user._id })
      .populate({
        path: 'auction',
        select: 'title status endTime currentBid images',
        populate: {
          path: 'seller',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bids.length,
      data: bids
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get bid details
// @route   GET /api/bids/:id
// @access  Private
const getBid = async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id)
      .populate('bidder', 'name email avatar')
      .populate({
        path: 'auction',
        populate: {
          path: 'seller',
          select: 'name email'
        }
      });

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: 'Bid not found'
      });
    }

    // Check if user is authorized to view this bid
    if (
      bid.bidder._id.toString() !== req.user._id.toString() &&
      bid.auction.seller._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this bid'
      });
    }

    res.json({
      success: true,
      data: bid
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getBidsForAuction,
  placeBid,
  getMyBids,
  getBid
};