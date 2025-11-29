const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const {
  uploadAadhaar,
  getDashboard,
  getProfile,
  updateProfile,
  uploadAvatar,
  getUserStats
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/stats', getUserStats);

// Protected routes
router.use(protect); // All routes below require authentication
router.get('/me', getMe);
router.put('/me', updateDetails);
router.put('/updatepassword', updatePassword);
router.get('/logout', logout);

// User profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);
router.post('/upload-aadhaar', upload.array('aadhaarImages', 2), uploadAadhaar);
router.get('/dashboard', getDashboard);

module.exports = router;