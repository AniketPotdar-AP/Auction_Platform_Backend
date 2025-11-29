const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        maxlength: [50, 'Category name cannot exceed 50 characters'],
        unique: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    icon: {
        type: String,
        trim: true
    },
    image: {
        type: String, // Cloudinary URL
        trim: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    subcategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    auctionCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for search and sorting

categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

// Virtual for full path
categorySchema.virtual('fullPath').get(function () {
    if (!this.parent) return this.name;
    // This would need to be populated recursively in practice
    return `${this.parent.name} > ${this.name}`;
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

// Pre-save middleware to update parent subcategories
categorySchema.pre('save', async function (next) {
    if (this.parent && this.isNew) {
        await mongoose.model('Category').findByIdAndUpdate(
            this.parent,
            { $push: { subcategories: this._id } }
        );
    }
    next();
});

// Static method to get main categories with subcategories
categorySchema.statics.getCategoriesWithSubs = async function () {
    const categories = await this.find({ parent: null, isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .populate({
            path: 'subcategories',
            match: { isActive: true },
            options: { sort: { sortOrder: 1, name: 1 } }
        });

    return categories;
};

module.exports = mongoose.model('Category', categorySchema);