const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
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
    addedAt: {
        type: Date,
        default: Date.now
    },
    notificationEnabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for performance
wishlistSchema.index({ user: 1, auction: 1 }, { unique: true });
wishlistSchema.index({ user: 1, addedAt: -1 });

// Prevent duplicate wishlist items
wishlistSchema.pre('save', async function (next) {
    if (this.isNew) {
        const existingItem = await this.constructor.findOne({
            user: this.user,
            auction: this.auction
        });

        if (existingItem) {
            return next(new Error('Auction already in wishlist'));
        }
    }
    next();
});

module.exports = mongoose.model('Wishlist', wishlistSchema);