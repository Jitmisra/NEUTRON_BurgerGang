const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  profile: {
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say']
    },
    height: Number, // in cm
    weight: Number, // in kg
    bloodType: String,
    conditions: [String],
    allergies: [String],
    medications: [String]
  },
  preferences: {
    units: {
      weight: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      },
      height: {
        type: String,
        enum: ['cm', 'ft'],
        default: 'cm'
      },
      temperature: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: true
      }
    },
    privacySettings: {
      shareDataForResearch: {
        type: Boolean,
        default: false
      },
      anonymizeData: {
        type: Boolean,
        default: true
      }
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  googleTokens: {
    type: Object,
    select: false // Don't return in queries by default
  },
  googleFitTokens: {
    access_token: String,
    refresh_token: String,
    expiry_date: Number
  },
  avatar: {
    type: String
  },
  connectedServices: {
    type: [String],
    enum: ['google', 'googleFit', 'facebook', 'apple', 'fitbit'],
    default: []
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
