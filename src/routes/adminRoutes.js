const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getAuctions,
  getStats,
  getPendingAuctions,
  getPendingVerifications,
  verifyAadhaar,
  handleDispute
} = require('../controllers/adminController');

const { getAuctionCreationAnalytics } = require('../controllers/userController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(protect);
router.use(authorize('admin'));

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.put('/users/:id/verify-aadhaar', verifyAadhaar);
router.delete('/users/:id', deleteUser);
router.get('/pending-verifications', getPendingVerifications);

// Auction management
router.get('/auctions', getAuctions);
router.get('/pending-auctions', getPendingAuctions);
router.put('/auctions/:id/dispute', handleDispute);

// Analytics
router.get('/stats', getStats);
router.get('/auction-creation-analytics', getAuctionCreationAnalytics);

module.exports = router;