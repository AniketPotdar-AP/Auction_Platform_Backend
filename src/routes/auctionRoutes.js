const express = require('express');
const {
  getAuctions,
  getAuction,
  createAuction,
  updateAuction,
  deleteAuction,
  approveAuction,
  getAuctionsBySeller,
  getMyAuctions,
  getWonAuctions,
  getActiveUsers
} = require('../controllers/auctionController');

const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes (non-parameterized first)
router.get('/', getAuctions);
router.get('/active-users', getActiveUsers);
router.get('/seller/:sellerId', getAuctionsBySeller);

// Protected routes - MUST come before /:id route
router.get('/won', protect, getWonAuctions);
router.get('/myauctions', protect, getMyAuctions);

// Now the dynamic :id route (after specific routes)
router.get('/:id', getAuction);

// Other protected routes
router.post('/', protect, authorize('canCreateAuction'), upload.array('images', 5), createAuction);
router.put('/:id', protect, authorize('canCreateAuction'), updateAuction);
router.delete('/:id', protect, authorize('canCreateAuction'), deleteAuction);

// Admin routes
router.put('/:id/approve', protect, authorize('admin'), approveAuction);

module.exports = router;