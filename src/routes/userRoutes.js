const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected routes
router.use(protect); // All routes below require authentication
router.get('/me', getMe);
router.put('/me', updateDetails);
router.put('/updatepassword', updatePassword);
router.get('/logout', logout);

module.exports = router;