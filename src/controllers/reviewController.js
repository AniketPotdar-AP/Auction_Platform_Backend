const mongoose = require('mongoose');
const Review = require('../models/Review');
const Auction = require('../models/Auction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Public
const getUserReviews = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        const reviews = await Review.find({ reviewee: req.params.userId })
            .populate('reviewer', 'name avatar')
            .populate('auction', 'title')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(startIndex);

        const total = await Review.countDocuments({ reviewee: req.params.userId });

        // Calculate average rating
        const avgResult = await Review.aggregate([
            { $match: { reviewee: mongoose.Types.ObjectId(req.params.userId) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        const averageRating = avgResult.length > 0 ? avgResult[0].averageRating : 0;
        const totalReviews = avgResult.length > 0 ? avgResult[0].totalReviews : 0;

        res.json({
            success: true,
            count: reviews.length,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
            data: reviews
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
    try {
        const { auctionId, rating, title, comment } = req.body;

        // Check if auction exists and is completed
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({
                success: false,
                message: 'Auction not found'
            });
        }

        if (auction.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only review completed auctions'
            });
        }

        // Check if user won this auction
        if (auction.winner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only auction winners can leave reviews'
            });
        }

        // Check if payment was completed
        if (auction.paymentStatus !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment must be completed before leaving a review'
            });
        }

        const review = await Review.create({
            reviewer: req.user._id,
            reviewee: auction.seller,
            auction: auctionId,
            rating,
            title,
            comment,
            isVerified: true // Since they won and paid
        });

        await review.populate('reviewer', 'name avatar');
        await review.populate('auction', 'title');

        // Create notification for seller
        await Notification.create({
            user: auction.seller,
            type: 'review_received',
            title: 'New Review Received',
            message: `You received a ${rating}-star review for "${auction.title}"`,
            auction: auctionId,
            data: { rating, reviewId: review._id }
        });

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'review_posted',
            description: `Review posted for auction: ${auction.title}`,
            metadata: { auctionId, rating, reviewee: auction.seller },
            auction: auctionId
        });

        res.status(201).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error(error);
        if (error.message.includes('already reviewed')) {
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

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private (Review owner only)
const updateReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check ownership
        if (review.reviewer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this review'
            });
        }

        const updatedReview = await Review.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('reviewer', 'name avatar')
            .populate('auction', 'title');

        res.json({
            success: true,
            data: updatedReview
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (Review owner or admin)
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check ownership or admin
        if (review.reviewer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review'
            });
        }

        await review.remove();

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'admin_action',
            description: `Review deleted for auction: ${review.auction}`,
            metadata: { reviewId: review._id, auctionId: review.auction }
        });

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { $inc: { helpful: 1 } },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.json({
            success: true,
            data: { helpful: review.helpful }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Report review
// @route   PUT /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res) => {
    try {
        const { reason } = req.body;

        const review = await Review.findByIdAndUpdate(
            req.params.id,
            {
                reported: true,
                reportReason: reason
            },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'admin_action',
            description: `Review reported: ${reason}`,
            metadata: { reviewId: review._id, reason }
        });

        res.json({
            success: true,
            message: 'Review reported successfully'
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
    getUserReviews,
    createReview,
    updateReview,
    deleteReview,
    markHelpful,
    reportReview
};