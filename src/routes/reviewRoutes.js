const express = require('express');
const {
    getUserReviews,
    createReview,
    updateReview,
    deleteReview,
    markHelpful,
    reportReview
} = require('../controllers/reviewController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/user/:userId', getUserReviews);

// Protected routes
router.use(protect);

router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.put('/:id/helpful', markHelpful);
router.put('/:id/report', reportReview);

module.exports = router;