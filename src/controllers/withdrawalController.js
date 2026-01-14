import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { createNotification } from '../utils/sendNotification.js';
import { broadcastAdminStats } from '../utils/broadcastStats.js';

// @desc    Get all withdrawal requests (Admin)
// @route   GET /api/admin/withdrawals
// @access  Private (Admin)
export const getAllWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { type: 'withdrawal' };
    if (status) query.status = status;

    const withdrawals = await Transaction.find(query)
      .populate('user', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Approve withdrawal (Admin)
// @route   PUT /api/admin/withdrawals/:id/approve
// @access  Private (Admin)
export const approveWithdrawal = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({
        success: false,
        message: 'This is not a withdrawal transaction',
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal already processed',
      });
    }

    // Update transaction status
    transaction.status = 'completed';
    await transaction.save();

    // Notify user
    await createNotification(
      transaction.user,
      'payment',
      'Withdrawal Approved',
      `Your withdrawal request of $${transaction.amount} has been approved and processed.`,
      { link: `/transactions/${transaction._id}` }
    );

    // Broadcast stats to admin
    broadcastAdminStats();

    res.status(200).json({
      success: true,
      message: 'Withdrawal approved successfully',
      data: { transaction },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Reject withdrawal (Admin)
// @route   PUT /api/admin/withdrawals/:id/reject
// @access  Private (Admin)
export const rejectWithdrawal = async (req, res) => {
  try {
    const { reason } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({
        success: false,
        message: 'This is not a withdrawal transaction',
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal already processed',
      });
    }

    // Refund to user earning balance
    const user = await User.findById(transaction.user);
    user.earningBalance += transaction.amount;
    await user.save();

    // Update transaction status
    transaction.status = 'failed';
    transaction.metadata = {
      ...transaction.metadata,
      rejectionReason: reason || 'Withdrawal rejected by admin',
      rejectedBy: req.user._id,
      rejectedAt: new Date(),
    };
    await transaction.save();

    // Notify user
    await createNotification(
      transaction.user,
      'payment',
      'Withdrawal Rejected',
      `Your withdrawal request of $${transaction.amount} has been rejected. Amount has been refunded to your wallet.`,
      { link: `/transactions/${transaction._id}` }
    );

    // Broadcast stats to admin
    broadcastAdminStats();

    res.status(200).json({
      success: true,
      message: 'Withdrawal rejected and amount refunded',
      data: { transaction },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

