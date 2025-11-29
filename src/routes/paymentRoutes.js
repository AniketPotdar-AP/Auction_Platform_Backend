const express = require('express');
const {
  createOrder,
  verifyPayment,
  getMyPayments
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/my-payments', getMyPayments);

module.exports = router;