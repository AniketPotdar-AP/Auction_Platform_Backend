const express = require('express');
const {
  createPaymentIntent,
  confirmPayment,
  getMyPayments,
  getPayment,
  processRefund
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.get('/my-payments', getMyPayments);
router.get('/:id', getPayment);

// Admin only
router.post('/:id/refund', authorize('admin'), processRefund);

module.exports = router;