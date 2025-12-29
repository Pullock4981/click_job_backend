import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'employer', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio must be less than 500 characters'],
    },
    skills: {
      type: [String],
      default: [],
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },
    activeJobs: {
      type: Number,
      default: 0,
    },
    loginHistory: [
      {
        ip: {
          type: String,
          default: '',
        },
        userAgent: {
          type: String,
          default: '',
        },
        loginAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    accountHealth: {
      percentage: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
      warnings: [
        {
          reason: {
            type: String,
            required: true,
          },
          issuedAt: {
            type: Date,
            default: Date.now,
          },
          resolvedAt: {
            type: Date,
          },
          status: {
            type: String,
            enum: ['active', 'resolved'],
            default: 'active',
          },
        },
      ],
      lastWarningAt: {
        type: Date,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Generate referral code before saving
userSchema.pre('save', async function (next) {
  if (!this.referralCode && this.isNew) {
    // Generate unique referral code
    let isUnique = false;
    let referralCode;
    while (!isUnique) {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const namePrefix = this.name.substring(0, 3).toUpperCase().replace(/\s/g, '') || 'USR';
      referralCode = `${namePrefix}${randomCode}`;
      const existing = await mongoose.model('User').findOne({ referralCode });
      if (!existing) {
        isUnique = true;
      }
    }
    this.referralCode = referralCode;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;

