import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a job title'],
      trim: true,
      maxlength: [200, 'Title must be less than 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a job description'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
    },
    subCategory: {
      type: String,
    },
    budget: {
      type: Number,
      required: [true, 'Please provide a budget'],
      min: [0, 'Budget must be positive'],
    },
    budgetType: {
      type: String,
      enum: ['fixed', 'hourly'],
      default: 'fixed',
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'completed', 'cancelled', 'pending-approval'],
      default: 'pending-approval',
    },
    adminStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    deleteRequested: {
      type: Boolean,
      default: false
    },
    adminRemark: {
      type: String,
      default: ''
    },
    requirements: {
      type: [String],
      default: [],
    },
    deadline: {
      type: Date,
    },
    applicants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
        message: String,
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    images: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    maxParticipants: {
      type: Number,
      default: 0,
    },
    workerNeed: {
      type: Number,
      required: true,
      default: 0
    },
    workerEarn: {
      type: Number,
      required: true,
      default: 0
    },
    requiredScreenshots: {
      type: Number,
      default: 1
    },
    estimatedDays: {
      type: Number,
      default: 3
    },
    boostPeriod: {
      type: String,
      default: 'None'
    },
    scheduleTime: {
      type: Date
    },
    selectedZone: {
      type: String,
      default: 'International'
    },
    hiddenCountries: {
      type: [String],
      default: []
    },
    taskInstructions: {
      type: [String],
      default: [],
    },
    requiredProof: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: '',
    },
    videoDuration: {
      type: Number, // in minutes
      default: 0,
    },
    taskType: {
      type: String,
      default: 'other',
    },
    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: '',
        },
        reportedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
          default: 'pending',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Enable virtuals in JSON
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

// Index for search
jobSchema.index({ title: 'text', description: 'text', tags: 'text' });
jobSchema.index({ category: 1, status: 1, budget: 1 });

const Job = mongoose.model('Job', jobSchema);

export default Job;

