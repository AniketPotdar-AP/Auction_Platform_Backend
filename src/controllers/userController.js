const User = require('../models/User');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Payment = require('../models/Payment');
const Wishlist = require('../models/Wishlist');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { uploadToImageKit } = require('../utils/imagekit');

// @desc    Upload Aadhaar documents
// @route   POST /api/users/upload-aadhaar
// @access  Private
const uploadAadhaar = async (req, res) => {
    try {
        const { aadhaarNumber } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate Aadhaar number
        if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Valid Aadhaar number is required'
            });
        }

        let aadhaarImages = [];

        // Upload images to ImageKit if provided
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToImageKit(file.buffer, 'aadhaar_documents', {
                    fileName: `${user._id}_${Date.now()}_${file.originalname}`
                });
                aadhaarImages.push(result.secure_url);
            }
        }

        // Update user
        user.aadhaarNumber = aadhaarNumber;
        user.aadhaarImages = aadhaarImages;
        user.verificationStatus = 'pending';
        await user.save();

        // Log activity
        await ActivityLog.logActivity({
            user: user._id,
            action: 'aadhaar_uploaded',
            description: 'Aadhaar documents uploaded for verification',
            metadata: { aadhaarNumber }
        });

        // Create notification for user
        await Notification.create({
            user: user._id,
            type: 'aadhaar_uploaded',
            title: 'Aadhaar Documents Submitted',
            message: 'Your Aadhaar documents have been submitted for verification. You will be notified once verified.',
            data: { verificationStatus: 'pending' }
        });

        res.json({
            success: true,
            message: 'Aadhaar documents uploaded successfully',
            data: {
                aadhaarNumber: user.aadhaarNumber,
                verificationStatus: user.verificationStatus,
                aadhaarImages: user.aadhaarImages
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

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
const getDashboard = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get user's auctions
        const myAuctions = await Auction.find({ seller: userId })
            .select('title status currentBid endTime winner paymentStatus')
            .sort({ createdAt: -1 })
            .limit(5);

        // Get auctions user has won
        const wonAuctions = await Auction.find({
            winner: userId,
            status: 'completed'
        })
            .select('title currentBid paymentStatus endTime seller')
            .populate('seller', 'name')
            .sort({ endTime: -1 })
            .limit(5);

        // Get active bids
        const activeBids = await Bid.find({ bidder: userId })
            .populate({
                path: 'auction',
                select: 'title currentBid endTime status',
                match: { status: 'active' }
            })
            .sort({ createdAt: -1 })
            .limit(5);

        // Get pending payments
        const pendingPayments = await Payment.find({
            user: userId,
            status: 'pending'
        })
            .populate('auction', 'title')
            .sort({ createdAt: -1 });

        // Get recent notifications
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(10);

        // Get wishlist count
        const wishlistCount = await Wishlist.countDocuments({ user: userId });

        // Get user stats
        const userStats = {
            totalAuctions: await Auction.countDocuments({ seller: userId }),
            activeAuctions: await Auction.countDocuments({ seller: userId, status: 'active' }),
            completedAuctions: await Auction.countDocuments({ seller: userId, status: 'completed' }),
            totalBids: await Bid.countDocuments({ bidder: userId }),
            wonAuctions: await Auction.countDocuments({ winner: userId, status: 'completed' }),
            wishlistItems: wishlistCount
        };

        res.json({
            success: true,
            data: {
                myAuctions,
                wonAuctions,
                activeBids,
                pendingPayments,
                notifications,
                stats: userStats
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

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

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

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const fieldsToUpdate = {
            name: req.body.name,
            phone: req.body.phone,
            address: req.body.address
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(key =>
            fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
        );

        const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        // Log activity
        await ActivityLog.logActivity({
            user: user._id,
            action: 'profile_updated',
            description: 'User profile updated',
            metadata: fieldsToUpdate
        });

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

// @desc    Upload profile avatar
// @route   POST /api/users/upload-avatar
// @access  Private
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image'
            });
        }

        // Upload to ImageKit
        const result = await uploadToImageKit(req.file.buffer, 'avatars', {
            fileName: `${req.user._id}_${Date.now()}`,
            width: 150,
            height: 150,
            crop: 'fill'
        });

        // Update user
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: result.secure_url },
            { new: true }
        );

        res.json({
            success: true,
            data: {
                avatar: user.avatar
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

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Public
const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const verifiedUsers = await User.countDocuments({ verificationStatus: 'verified' });
        const activeAuctions = await Auction.countDocuments({ status: 'active' });
        const totalAuctions = await Auction.countDocuments();

        res.json({
            success: true,
            totalUsers,
            verifiedUsers,
            activeAuctions,
            totalAuctions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get user creation analytics
// @route   GET /api/users/creation-analytics
// @access  Private
const getUserCreationAnalytics = async (req, res) => {
    try {
        // Get user registrations for the last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const userCreationData = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Format the data for the chart
        const labels = [];
        const data = [];

        // Generate labels for the last 12 months
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            labels.push(`${monthName} ${year}`);
        }

        // Map the aggregated data to the labels
        const dataMap = {};
        userCreationData.forEach(item => {
            const monthName = new Date(item._id.year, item._id.month - 1, 1).toLocaleString('default', { month: 'short' });
            const key = `${monthName} ${item._id.year}`;
            dataMap[key] = item.count;
        });

        // Fill data array with counts or 0
        labels.forEach(label => {
            data.push(dataMap[label] || 0);
        });

        res.json({
            success: true,
            data: {
                labels,
                data
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

// @desc    Get auction creation analytics
// @route   GET /api/users/auction-creation-analytics
// @access  Private (Admin only)
const getAuctionCreationAnalytics = async (req, res) => {
    try {
        // Get auction creations for the last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const auctionCreationData = await Auction.aggregate([
            {
                $match: {
                    createdAt: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Format the data for the chart
        const labels = [];
        const data = [];

        // Generate labels for the last 12 months
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            labels.push(`${monthName} ${year}`);
        }

        // Map the aggregated data to the labels
        const dataMap = {};
        auctionCreationData.forEach(item => {
            const monthName = new Date(item._id.year, item._id.month - 1, 1).toLocaleString('default', { month: 'short' });
            const key = `${monthName} ${item._id.year}`;
            dataMap[key] = item.count;
        });

        // Fill data array with counts or 0
        labels.forEach(label => {
            data.push(dataMap[label] || 0);
        });

        res.json({
            success: true,
            data: {
                labels,
                data
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

module.exports = {
    uploadAadhaar,
    getDashboard,
    getProfile,
    updateProfile,
    uploadAvatar,
    getUserStats,
    getUserCreationAnalytics,
    getAuctionCreationAnalytics
};