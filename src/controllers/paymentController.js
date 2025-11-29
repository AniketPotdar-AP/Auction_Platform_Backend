const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Auction = require('../models/Auction');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// Lazy initialization of Razorpay
let razorpay = null;
const getRazorpay = () => {
  if (!razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpay;
};

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { auctionId, amount } = req.body;

    // Validate auction exists and user won it
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Auction not found'
      });
    }

    if (auction.winner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the winner of this auction'
      });
    }

    if (auction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Auction is not completed yet'
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      user: req.user._id,
      auction: auctionId,
      status: { $in: ['pending', 'completed'] }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already initiated for this auction'
      });
    }

    const options = {
      amount: amount * 100, // amount in paisa
      currency: 'INR',
      receipt: `auction_${auctionId}_${Date.now()}`,
      payment_capture: 1
    };

    const razorpayInstance = getRazorpay();
    if (!razorpayInstance) {
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured'
      });
    }

    const order = await razorpayInstance.orders.create(options);

    // Create payment record
    const payment = await Payment.create({
      user: req.user._id,
      auction: auctionId,
      amount: amount,
      currency: 'INR',
      status: 'pending',
      paymentMethod: 'razorpay',
      transactionId: order.id,
      orderId: order.id
    });

    // Log activity
    await ActivityLog.logActivity({
      user: req.user._id,
      action: 'payment_initiated',
      description: `Payment initiated for auction: ${auction.title}`,
      metadata: { auctionId, amount, orderId: order.id },
      auction: auctionId,
      payment: payment._id
    });

    res.status(200).json({
      success: true,
      order,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment order creation failed',
      error: error.message
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, auctionId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Update payment status
      const payment = await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        {
          status: 'completed',
          paymentId: razorpay_payment_id,
          transactionId: razorpay_payment_id
        },
        { new: true }
      ).populate('auction');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment record not found'
        });
      }

      // Update auction payment status if needed
      await Auction.findByIdAndUpdate(auctionId, {
        paymentStatus: 'paid'
      });

      // Create notification for seller
      const auction = payment.auction;
      await Notification.create({
        user: auction.seller,
        type: 'payment_successful',
        title: 'Payment Received',
        message: `Payment of ₹${payment.amount} received for auction: ${auction.title}`,
        auction: auctionId
      });

      // Log activity
      await ActivityLog.logActivity({
        user: req.user._id,
        action: 'payment_completed',
        description: `Payment completed for auction: ${auction.title}`,
        metadata: { auctionId, amount: payment.amount, paymentId: razorpay_payment_id },
        auction: auctionId,
        payment: payment._id
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        payment
      });
    } else {
      // Update payment status to failed
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: 'failed' }
      );

      res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('Razorpay verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// @desc    Get user's payments
// @route   GET /api/payments/my-payments
// @access  Private
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('auction', 'title images status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments
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
  createOrder,
  verifyPayment,
  getMyPayments
};