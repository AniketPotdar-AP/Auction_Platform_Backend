const Category = require('../models/Category');
const Auction = require('../models/Auction');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all categories with subcategories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
    try {
        const categories = await Category.getCategoriesWithSubs();

        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('subcategories');

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin only)
const createCategory = async (req, res) => {
    try {
        const category = await Category.create(req.body);

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'admin_action',
            description: `Category created: ${category.name}`,
            metadata: { categoryId: category._id, categoryName: category.name }
        });

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'admin_action',
            description: `Category updated: ${category.name}`,
            metadata: { categoryId: category._id, updates: req.body }
        });

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category has auctions
        const auctionCount = await Auction.countDocuments({ category: category._id });
        if (auctionCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with existing auctions'
            });
        }

        // Check if category has subcategories
        if (category.subcategories && category.subcategories.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with subcategories. Delete subcategories first.'
            });
        }

        await category.remove();

        // Log activity
        await ActivityLog.logActivity({
            user: req.user._id,
            action: 'admin_action',
            description: `Category deleted: ${category.name}`,
            metadata: { categoryId: category._id, categoryName: category.name }
        });

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get category statistics
// @route   GET /api/categories/stats
// @access  Private (Admin only)
const getCategoryStats = async (req, res) => {
    try {
        const stats = await Category.aggregate([
            {
                $lookup: {
                    from: 'auctions',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'auctions'
                }
            },
            {
                $addFields: {
                    auctionCount: { $size: '$auctions' }
                }
            },
            {
                $project: {
                    name: 1,
                    auctionCount: 1,
                    isActive: 1
                }
            },
            { $sort: { auctionCount: -1 } }
        ]);

        res.json({
            success: true,
            data: stats
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
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryStats
};