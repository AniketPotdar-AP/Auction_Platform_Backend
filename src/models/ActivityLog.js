const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'user_registered',
            'user_login',
            'user_logout',
            'profile_updated',
            'password_changed',
            'aadhaar_uploaded',
            'auction_created',
            'auction_updated',
            'auction_deleted',
            'auction_approved',
            'auction_rejected',
            'bid_placed',
            'bid_won',
            'bid_outbid',
            'payment_initiated',
            'payment_completed',
            'payment_failed',
            'review_posted',
            'wishlist_added',
            'wishlist_removed',
            'notification_read',
            'admin_action'
        ]
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    },
    auction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auction'
    },
    bid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid'
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }
}, {
    timestamps: true
});

// Index for performance
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ auction: 1 });
activityLogSchema.index({ createdAt: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function (data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw error to avoid breaking main functionality
    }
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);