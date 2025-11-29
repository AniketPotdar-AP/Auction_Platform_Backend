const Wishlist = require('../models/Wishlist');
const Auction = require('../models/Auction');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        const wishlist = await Wishlist.find({ user: req.user._id })
            .populate({
                path: 'auction',
                populate: {
                    path: 'seller',
                    select: 'name avatar sellerRating'
                }
            })
            .sort({ addedAt: -1 })
            .limit(limit)
            .skip(startIndex);

        const total = await Wishlist.countDocuments({ user: req.user._id });

        res.json({
            success: true,
            count: wishlist.length,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            data: wishlist
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Add auction to wishlist
// @route   POST /api/wishlist
// @access  Private
const addToWishlist = async (req, res) => {
    try {
        const { auctionId } = req.body;

        // Check if auction exists
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({
                success: false,
                message: 'Auction not found'
            });
        }

        // Check if already in wishlist
        const existingItem = await Wishlist.findOne({
            user: req.user._id,
            auction: auctionId
        });

        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: 'Auction already in wishlist'
            });
        }

        const wishlistItem = await Wishlist.create({
            user: req.user._id,
            auction: auctionId
        });

        await wishlistItem.populate({
            path: 'auction',
            populate: {
                path: 'seller',
                select: 'name avatar sellerRating'
            }
        });

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'wishlist_added',
            description: `Added to wishlist: ${auction.title}`,
            metadata: { auctionId },
            auction: auctionId
        });

        res.status(201).json({
            success: true,
            data: wishlistItem
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Remove from wishlist
// @route   DELETE /api/wishlist/:auctionId
// @access  Private
const removeFromWishlist = async (req, res) => {
    try {
        const wishlistItem = await Wishlist.findOneAndDelete({
            user: req.user._id,
            auction: req.params.auctionId
        });

        if (!wishlistItem) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in wishlist'
            });
        }

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'wishlist_removed',
            description: `Removed from wishlist: ${req.params.auctionId}`,
            metadata: { auctionId: req.params.auctionId }
        });

        res.json({
            success: true,
            message: 'Removed from wishlist successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Check if auction is in wishlist
// @route   GET /api/wishlist/check/:auctionId
// @access  Private
const checkWishlist = async (req, res) => {
    try {
        const item = await Wishlist.findOne({
            user: req.user._id,
            auction: req.params.auctionId
        });

        res.json({
            success: true,
            inWishlist: !!item
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Toggle wishlist (add if not exists, remove if exists)
// @route   PUT /api/wishlist/toggle/:auctionId
// @access  Private
const toggleWishlist = async (req, res) => {
    try {
        const existingItem = await Wishlist.findOne({
            user: req.user._id,
            auction: req.params.auctionId
        });

        if (existingItem) {
            // Remove from wishlist
            await existingItem.remove();

            // Log activity
            await ActivityLog.logActivity({
                user: req.user._id,
                action: 'wishlist_removed',
                description: `Removed from wishlist: ${req.params.auctionId}`,
                metadata: { auctionId: req.params.auctionId }
            });

            res.json({
                success: true,
                action: 'removed',
                message: 'Removed from wishlist'
            });
        } else {
            // Add to wishlist
            const auction = await Auction.findById(req.params.auctionId);
            if (!auction) {
                return res.status(404).json({
                    success: false,
                    message: 'Auction not found'
                });
            }

            const wishlistItem = await Wishlist.create({
                user: req.user._id,
                auction: req.params.auctionId
            });

            // Log activity
            await ActivityLog.logActivity({
                user: req.user._id,
                action: 'wishlist_added',
                description: `Added to wishlist: ${auction.title}`,
                metadata: { auctionId: req.params.auctionId },
                auction: req.params.auctionId
            });

            res.json({
                success: true,
                action: 'added',
                message: 'Added to wishlist'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlist,
    toggleWishlist
};