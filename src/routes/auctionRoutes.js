const express = require('express');
const {
  getAuctions,
  getAuction,
  createAuction,
  updateAuction,
  deleteAuction,
  approveAuction,
  getAuctionsBySeller,
  getMyAuctions
} = require('../controllers/auctionController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAuctions);
router.get('/:id', getAuction);
router.get('/seller/:sellerId', getAuctionsBySeller);

// Protected routes
router.use(protect);

// Seller routes
router.get('/myauctions', authorize('seller'), getMyAuctions);
router.post('/', authorize('seller'), createAuction);
router.put('/:id', authorize('seller'), updateAuction);
router.delete('/:id', authorize('seller'), deleteAuction);

// Admin routes
router.put('/:id/approve', authorize('admin'), approveAuction);

module.exports = router;