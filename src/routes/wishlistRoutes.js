const express = require('express');
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlist,
    toggleWishlist
} = require('../controllers/wishlistController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.delete('/:auctionId', removeFromWishlist);
router.get('/check/:auctionId', checkWishlist);
router.put('/toggle/:auctionId', toggleWishlist);

module.exports = router;