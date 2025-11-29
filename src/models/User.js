const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function (email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  userType: {
    type: String,
    default: 'regular'
  },
  permissions: {
    canBid: {
      type: Boolean,
      default: true
    },
    canCreateAuction: {
      type: Boolean,
      default: true // Temporarily allow all users to create auctions for testing
    }
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  // Aadhaar verification fields
  aadhaarNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^\d{12}$/.test(v); // 12 digits
      },
      message: 'Aadhaar number must be 12 digits'
    }
  },
  aadhaarImages: [{
    type: String, // Cloudinary URLs
    required: false
  }],
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationNotes: {
    type: String,
    trim: true
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  // Seller rating
  sellerRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update permissions before saving
userSchema.pre('save', function (next) {
  if (this.isModified('verificationStatus')) {
    this.updatePermissions();
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update permissions based on verification status
userSchema.methods.updatePermissions = function () {
  this.permissions.canBid = true; // Always true for logged-in users
  // Keep canCreateAuction as default true for testing
  // this.permissions.canCreateAuction = this.verificationStatus === 'verified';
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpire;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);