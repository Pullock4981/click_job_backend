import mongoose from 'mongoose';

const workSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    submissionProof: {
      type: String,
      default: '',
    },
    submissionFiles: {
      type: [String],
      default: [],
    },
    submissionDate: {
      type: Date,
    },
    submissionMessage: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    paidAt: {
      type: Date,
    },
    employerFeedback: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index
workSchema.index({ worker: 1, status: 1 });
workSchema.index({ employer: 1, status: 1 });
workSchema.index({ job: 1 });

const Work = mongoose.model('Work', workSchema);

export default Work;

