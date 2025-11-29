const User = require('../models/User');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await User.countDocuments();

    res.json({
      success: true,
      count: users.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.remove();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all auctions (admin view)
// @route   GET /api/admin/auctions
// @access  Private (Admin only)
const getAuctions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const auctions = await Auction.find()
      .populate('seller', 'name email')
      .populate('winner', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await Auction.countDocuments();

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

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAuctions = await Auction.countDocuments();
    const activeAuctions = await Auction.countDocuments({ status: 'active' });
    const completedAuctions = await Auction.countDocuments({ status: 'completed' });
    const totalBids = await Bid.countDocuments();
    const totalPayments = await Payment.countDocuments({ status: 'completed' });

    // Revenue calculation
    const payments = await Payment.find({ status: 'completed' });
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Monthly stats (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const monthlyAuctions = await Auction.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const monthlyRevenue = payments
      .filter(payment => payment.createdAt >= thirtyDaysAgo)
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Category distribution
    const categoryStats = await Auction.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalAuctions,
          activeAuctions,
          completedAuctions,
          totalBids,
          totalPayments,
          totalRevenue
        },
        monthly: {
          users: monthlyUsers,
          auctions: monthlyAuctions,
          revenue: monthlyRevenue
        },
        categories: categoryStats
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get pending auctions for approval
// @route   GET /api/admin/pending-auctions
// @access  Private (Admin only)
const getPendingAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ isApproved: false, status: 'pending' })
      .populate('seller', 'name email')
      .select('title description basePrice startingBid category endTime images seller status isApproved createdAt')
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

// @desc    Verify user Aadhaar
// @route   PUT /api/admin/users/:id/verify-aadhaar
// @access  Private (Admin only)
const verifyAadhaar = async (req, res) => {
  try {
    const { status, notes } = req.body; // status: 'verified' or 'rejected'

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.aadhaarNumber || user.aadhaarImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User has not uploaded Aadhaar documents'
      });
    }

    user.verificationStatus = status;
    user.verificationNotes = notes || '';
    user.verifiedAt = new Date();
    user.verifiedBy = req.user._id;
    await user.save();

    // Create notification for user
    const notificationType = status === 'verified' ? 'aadhaar_verified' : 'aadhaar_rejected';
    const title = status === 'verified' ? 'Aadhaar Verified' : 'Aadhaar Verification Rejected';
    const message = status === 'verified'
      ? 'Your Aadhaar verification has been completed successfully. You now have verified status.'
      : `Your Aadhaar verification was rejected. Reason: ${notes || 'No reason provided'}`;

    await Notification.create({
      user: user._id,
      type: notificationType,
      title,
      message,
      data: { verificationStatus: status, notes }
    });

    // Log activity
    await ActivityLog.logActivity({
      user: req.user._id,
      action: 'admin_action',
      description: `Aadhaar verification ${status} for user ${user.name}`,
      metadata: { targetUser: user._id, status, notes }
    });

    res.json({
      success: true,
      message: `User Aadhaar ${status} successfully`,
      data: {
        userId: user._id,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get pending Aadhaar verifications
// @route   GET /api/admin/pending-verifications
// @access  Private (Admin only)
const getPendingVerifications = async (req, res) => {
  try {
    const users = await User.find({
      verificationStatus: 'pending',
      aadhaarNumber: { $exists: true, $ne: null }
    })
      .select('name email aadhaarNumber aadhaarImages verificationStatus createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Handle dispute
// @route   PUT /api/admin/auctions/:id/dispute
// @access  Private (Admin only)
const handleDispute = async (req, res) => {
  try {
    const { action, winner } = req.body; // action: 'change_winner' or 'cancel_auction'

    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (action === 'change_winner') {
      auction.winner = winner;
    } else if (action === 'cancel_auction') {
      auction.status = 'cancelled';
    }

    await auction.save();

    // Create notification
    await Notification.create({
      user: auction.seller,
      type: 'auction_approved', // Using existing type, could create new dispute type
      title: 'Dispute Resolved',
      message: `The dispute for your auction "${auction.title}" has been resolved.`,
      auction: auction._id
    });

    // Log activity
    await ActivityLog.logActivity({
      user: req.user._id,
      action: 'admin_action',
      description: `Dispute handled for auction ${auction.title}`,
      metadata: { auctionId: auction._id, action, winner }
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

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getAuctions,
  getStats,
  getPendingAuctions,
  verifyAadhaar,
  getPendingVerifications,
  handleDispute
};