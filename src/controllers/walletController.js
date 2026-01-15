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

    console.log('Deposit Request:', { amount, paymentMethod, referenceId, user: req.user._id });

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      status: 'pending', // Explicitly pending
      description: `Deposit of $${amount}`,
      referenceId: referenceId || null,
      paymentMethod: paymentMethod || 'wallet',
      metadata: req.body.metadata || {},
    });

    // Notify user
    await createNotification(
      req.user._id,
      'payment',
      'Deposit Request Submitted',
      `Your deposit request of $${amount} has been submitted and is pending approval.`,
      { link: `/transactions/${transaction._id}` }
    );

    res.status(200).json({
      success: true,
      message: 'Deposit request submitted successfully. Please wait for admin approval.',
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

// @desc    Convert earning balance to deposit balance
// @route   POST /api/wallet/convert
// @access  Private
export const convertEarningsToDeposit = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum conversion amount is $1',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.earningBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient earning balance',
      });
    }

    const feePercent = 0.10; // 10%
    const fee = amount * feePercent;
    const netAmount = amount - fee;

    // Deduct from earning
    user.earningBalance -= amount;

    // Add to deposit
    user.depositBalance += netAmount;

    await user.save();

    // Create Transaction Record
    await Transaction.create({
      user: req.user._id,
      type: 'conversion',
      amount: amount, // Logging the full amount converted
      status: 'completed',
      description: `Converted $${amount} earnings to deposit (Fee: $${fee.toFixed(3)})`,
      metadata: {
        fee,
        netAmount,
        convertedFrom: 'earning',
        convertedTo: 'deposit'
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully converted $${amount} to deposit balance`,
      data: {
        earningBalance: user.earningBalance,
        depositBalance: user.depositBalance
      }
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during conversion',
      error: error.message,
    });
  }
};

