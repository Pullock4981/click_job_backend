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
      enum: ['user', 'employer', 'admin', 'superadmin'],
      default: 'user',
    },
    phone: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
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
    age: {
      type: Number,
      default: null,
    },
    country: {
      type: String,
      default: 'Bangladesh',
    },
    securityCode: {
      type: String,
      default: '',
      select: false,
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
    earningBalance: {
      type: Number,
      default: 0,
    },
    depositBalance: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    numericId: {
      type: Number,
      unique: true,
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

// Generate referral code and numeric ID before saving
userSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Generate unique referral code
    if (!this.referralCode) {
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

    // Generate unique numeric ID
    if (!this.numericId) {
      let isIdUnique = false;
      let numericId;
      while (!isIdUnique) {
        numericId = Math.floor(10000 + Math.random() * 90000);
        const existingId = await mongoose.model('User').findOne({ numericId });
        if (!existingId) {
          isIdUnique = true;
        }
      }
      this.numericId = numericId;
    }
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

