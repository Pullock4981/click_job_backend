import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../utils/sendNotification.js';
import { processReferralEarnings } from '../controllers/referralController.js';

// @desc    Get wallet balance
// @route   GET /api/wallet
// @access  Private
export const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('earningBalance depositBalance totalEarnings');

    res.status(200).json({
      success: true,
      data: {
        wallet: {
          earningBalance: user.earningBalance,
          depositBalance: user.depositBalance,
          totalEarnings: user.totalEarnings,
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

// @desc    Deposit money
// @route   POST /api/wallet/deposit
// @access  Private
export const deposit = async (req, res) => {
  try {
    const { amount, paymentMethod, referenceId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      status: 'pending',
      description: `Deposit of $${amount}`,
      referenceId: referenceId || null,
      paymentMethod: paymentMethod || 'wallet',
      metadata: req.body.metadata || {},
    });

    // In production, verify payment gateway here
    transaction.status = 'completed';
    await transaction.save();

    // Update user deposit balance
    const user = await User.findById(req.user._id);
    user.depositBalance += amount;
    await user.save();

    // Process referral earnings
    await processReferralEarnings(req.user._id, 'deposit', amount);

    // Notify user
    await createNotification(
      req.user._id,
      'payment',
      'Deposit Successful',
      `Your deposit of $${amount} has been processed successfully.`,
      { link: `/transactions/${transaction._id}` }
    );

    res.status(200).json({
      success: true,
      message: 'Deposit successful',
      data: { transaction, depositBalance: user.depositBalance },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Withdraw money
// @route   POST /api/wallet/withdraw
// @access  Private
export const withdraw = async (req, res) => {
  try {
    const { amount, paymentMethod, accountDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    const user = await User.findById(req.user._id);

    if (user.earningBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient earning balance',
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      description: `Withdrawal of $${amount}`,
      paymentMethod: paymentMethod || 'bank',
      metadata: { accountDetails: accountDetails || {} },
    });

    // Deduct from earning balance
    user.earningBalance -= amount;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted',
      data: { transaction, earningBalance: user.earningBalance },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

