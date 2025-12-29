import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'job_applied',
        'job_completed',
        'work_submitted',
        'work_approved',
        'payment_received',
        'job_posted',
        'job_assigned',
      ],
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    work: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Work',
    },
    progress: {
      current: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    amount: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ isPublic: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;

