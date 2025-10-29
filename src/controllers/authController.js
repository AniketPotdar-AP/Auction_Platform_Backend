const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { body, validationResult } = require('express-validator');

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
const register = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'buyer'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      }
   });
   } catch (error) {
     console.error(error);
     res.status(500).json({
       success: false,
       message: 'Server error'
     });
   }
 }
];

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const login = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user,
        token
      }
    });
   } catch (error) {
     console.error(error);
     res.status(500).json({
       success: false,
       message: 'Server error'
     });
   }
 }
];

// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user details
// @route   PUT /api/users/me
// @access  Private
const updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update password
// @route   PUT /api/users/updatepassword
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user,
        token
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

// @desc    Logout user / clear cookie
// @route   GET /api/users/logout
// @access  Private
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  logout
};