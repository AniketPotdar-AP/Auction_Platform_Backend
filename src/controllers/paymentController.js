const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Auction = require('../models/Auction');
const Notification = require('../models/Notification');

// @desc    Create payment intent
// @route   POST /api/payments/create-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
  try {
    const { auctionId, amount } = req.body;

    // Verify auction exists and user is the winner
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
        message: 'Auction is not completed'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'inr',
      metadata: {
        auctionId: auctionId,
        userId: req.user._id.toString()
      }
    });

    // Save payment record
    const payment = await Payment.create({
      user: req.user._id,
      auction: auctionId,
      amount,
      paymentMethod: 'stripe',
      transactionId: paymentIntent.id,
      paymentIntentId: paymentIntent.id
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update payment record
      const payment = await Payment.findOneAndUpdate(
        { paymentIntentId },
        {
          status: 'completed',
          metadata: paymentIntent.metadata
        },
        { new: true }
      );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment record not found'
        });
      }

      // Create notification for seller
      const auction = await Auction.findById(payment.auction).populate('seller', 'name');
      await Notification.create({
        user: auction.seller,
        type: 'payment_required', // Could be 'payment_received'
        title: 'Payment Received',
        message: `Payment of $${payment.amount} has been received for your auction "${auction.title}"`,
        auction: payment.auction
      });

      res.json({
        success: true,
        data: payment
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's payments
// @route   GET /api/payments/my-payments
// @access  Private
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate({
        path: 'auction',
        select: 'title images seller',
        populate: {
          path: 'seller',
          select: 'name'
        }
      })
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

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: 'auction',
        populate: {
          path: 'seller winner',
          select: 'name email'
        }
      })
      .populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user is authorized
    if (
      payment.user.toString() !== req.user._id.toString() &&
      payment.auction.seller.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Process refund
// @route   POST /api/payments/:id/refund
// @access  Private (Admin only)
const processRefund = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not completed'
      });
    }

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
      amount: Math.round(payment.amount * 100)
    });

    // Update payment status
    payment.status = 'refunded';
    payment.metadata = { ...payment.metadata, refundId: refund.id };
    await payment.save();

    // Create notification
    await Notification.create({
      user: payment.user,
      type: 'payment_required', // Could create 'refund_processed' type
      title: 'Refund Processed',
      message: `Refund of $${payment.amount} has been processed for auction payment`,
      auction: payment.auction
    });

    res.json({
      success: true,
      data: payment
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
  createPaymentIntent,
  confirmPayment,
  getMyPayments,
  getPayment,
  processRefund
};