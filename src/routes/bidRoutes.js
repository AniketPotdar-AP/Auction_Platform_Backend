const express = require('express');
const {
  getBidsForAuction,
  placeBid,
  updateBid,
  getMyBids,
  getBid
} = require('../controllers/bidController');

const { protect } = require('../middleware/auth');
const { bidLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes
router.get('/auction/:auctionId', getBidsForAuction);

// Protected routes
router.use(protect);
router.post('/', bidLimiter, placeBid);
router.put('/:id', bidLimiter, updateBid);
router.get('/my-bids', getMyBids);
router.get('/:id', getBid);

module.exports = router;