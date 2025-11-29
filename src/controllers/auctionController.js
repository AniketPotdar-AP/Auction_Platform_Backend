const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadToImageKit } = require('../utils/imagekit');

// @desc    Get all auctions
// @route   GET /api/auctions
// @access  Public
const getAuctions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    let query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      query.status = { $in: ['active', 'pending'] };
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by seller
    if (req.query.seller) {
      query.seller = req.query.seller;
    }

    // Search by title or description
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.$or = [
        { basePrice: { $gte: req.query.minPrice || 0, $lte: req.query.maxPrice || Infinity } },
        { currentBid: { $gte: req.query.minPrice || 0, $lte: req.query.maxPrice || Infinity } }
      ];
    }

    // Sort options
    let sortOptions = { createdAt: -1 };
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      sortOptions = sortBy;
    }

    const auctions = await Auction.find(query)
      .populate('seller', 'name avatar')
      .populate('winner', 'name avatar')
      .sort(sortOptions)
      .limit(limit)
      .skip(startIndex);

    const total = await Auction.countDocuments(query);

    res.json({
      success: true,
      count: auctions.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: auctions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single auction
// @route   GET /api/auctions/:id
// @access  Public
const getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('seller', 'name email avatar phone')
      .populate('winner', 'name email avatar')
      .populate({
        path: 'bids',
        populate: {
          path: 'bidder',
          select: 'name avatar'
        },
        options: { sort: { amount: -1 } }
      });

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Increment view count
    auction.views += 1;
    await auction.save();

    res.json({
      success: true,
      data: auction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new auction
// @route   POST /api/auctions
// @access  Private (Seller only)
const createAuction = async (req, res) => {
  try {
    // Add seller to req.body
    req.body.seller = req.user._id;

    // Upload images to ImageKit
    if (req.files && req.files.length > 0) {
      const imageUrls = [];
      for (const file of req.files) {
        const result = await uploadToImageKit(file.buffer);
        imageUrls.push(result.secure_url);
      }
      req.body.images = imageUrls;
    }

    const auction = await Auction.create(req.body);

    res.status(201).json({
      success: true,
      data: auction
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update auction
// @route   PUT /api/auctions/:id
// @access  Private (Seller/Admin only)
const updateAuction = async (req, res) => {
  try {
    let auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Make sure user is auction seller
    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this auction'
      });
    }

    // Don't allow updates if auction has bids
    if (auction.bids.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update auction that has received bids'
      });
    }

    auction = await Auction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: auction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete auction
// @route   DELETE /api/auctions/:id
// @access  Private (Seller/Admin only)
const deleteAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    // Make sure user is auction seller
    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this auction'
      });
    }

    // Don't allow deletion if auction has bids
    if (auction.bids.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete auction that has received bids'
      });
    }

    await auction.remove();

    res.json({
      success: true,
      message: 'Auction deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve auction
// @route   PUT /api/auctions/:id/approve
// @access  Private (Admin only)
const approveAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    auction.isApproved = true;
    auction.status = 'active';
    auction.approvedBy = req.user._id;
    auction.approvedAt = new Date();

    await auction.save();

    // Create notification for seller
    await Notification.create({
      user: auction.seller,
      type: 'auction_approved',
      title: 'Auction Approved',
      message: `Your auction "${auction.title}" has been approved and is now live.`,
      auction: auction._id
    });

    res.json({
      success: true,
      data: auction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get auctions by seller
// @route   GET /api/auctions/seller/:sellerId
// @access  Public
const getAuctionsBySeller = async (req, res) => {
  try {
    const auctions = await Auction.find({ seller: req.params.sellerId })
      .populate('seller', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: auctions.length,
      data: auctions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get my auctions
// @route   GET /api/auctions/myauctions
// @access  Private (Seller only)
const getMyAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ seller: req.user._id })
      .populate('winner', 'name avatar email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: auctions.length,
      data: auctions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get auctions won by user
// @route   GET /api/auctions/won
// @access  Private
const getWonAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({
      winner: req.user._id,
      status: 'completed'
    })
      .populate('seller', 'name avatar email sellerRating')
      .sort({ endTime: -1 });

    res.json({
      success: true,
      count: auctions.length,
      data: auctions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get active users count
// @route   GET /api/auctions/active-users
// @access  Public
const getActiveUsers = async (req, res) => {
  try {
    // Count users who have logged in within the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersCount = await User.countDocuments({
      lastLogin: { $gte: oneDayAgo }
    });

    res.json({
      success: true,
      count: activeUsersCount
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
  getAuctions,
  getAuction,
  createAuction,
  updateAuction,
  deleteAuction,
  approveAuction,
  getAuctionsBySeller,
  getMyAuctions,
  getWonAuctions,
  getActiveUsers
};