const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getAuctions,
  getStats,
  getPendingAuctions,
  handleDispute
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(protect);
router.use(authorize('admin'));

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Auction management
router.get('/auctions', getAuctions);
router.get('/pending-auctions', getPendingAuctions);
router.put('/auctions/:id/dispute', handleDispute);

// Analytics
router.get('/stats', getStats);

module.exports = router;