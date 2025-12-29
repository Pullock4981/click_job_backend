import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
      maxlength: [500, 'Comment must be less than 500 characters'],
    },
    type: {
      type: String,
      enum: ['worker_to_employer', 'employer_to_worker'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index
reviewSchema.index({ reviewed: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ job: 1 });
reviewSchema.index({ work: 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;

