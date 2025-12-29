import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'deposit',
        'withdrawal',
        'payment',
        'earning',
        'referral',
        'refund',
        'bonus',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    description: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      sparse: true,
    },
    paymentMethod: {
      type: String,
      enum: ['bank', 'card', 'paypal', 'stripe', 'razorpay', 'wallet'],
    },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    relatedWork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Work',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ referenceId: 1 }, { unique: true, sparse: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;

