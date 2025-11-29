const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    auction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auction',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    isVerified: {
        type: Boolean,
        default: false // True if reviewer won the auction
    },
    helpful: {
        type: Number,
        default: 0
    },
    reported: {
        type: Boolean,
        default: false
    },
    reportReason: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for performance
reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ auction: 1 });
reviewSchema.index({ rating: 1 });

// Prevent duplicate reviews for same auction
reviewSchema.pre('save', async function (next) {
    if (this.isNew) {
        const existingReview = await this.constructor.findOne({
            reviewer: this.reviewer,
            auction: this.auction
        });

        if (existingReview) {
            return next(new Error('You have already reviewed this auction'));
        }
    }
    next();
});

// Update seller rating after review is saved
reviewSchema.post('save', async function () {
    const Review = this.constructor;
    const User = mongoose.model('User');

    // Calculate new average rating for the reviewee
    const reviews = await Review.find({ reviewee: this.reviewee });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await User.findByIdAndUpdate(this.reviewee, {
        sellerRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: reviews.length
    });
});

// Static method to get average rating for a user
reviewSchema.statics.getAverageRating = async function (userId) {
    const result = await this.aggregate([
        { $match: { reviewee: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    return result.length > 0 ? {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        totalReviews: result[0].totalReviews
    } : { averageRating: 0, totalReviews: 0 };
};

module.exports = mongoose.model('Review', reviewSchema);