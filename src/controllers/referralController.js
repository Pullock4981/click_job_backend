import User from '../models/User.js';
import Referral from '../models/Referral.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../utils/sendNotification.js';

// @desc    Get my referral code
// @route   GET /api/referrals/my-code
// @access  Private
export const getMyReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('referralCode name');

    res.status(200).json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`,
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

// @desc    Get my referrals
// @route   GET /api/referrals/my-referrals
// @access  Private
export const getMyReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referred', 'name email createdAt walletBalance totalEarnings')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { referrals },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get referral earnings
// @route   GET /api/referrals/earnings
// @access  Private
export const getReferralEarnings = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user._id });

    const totalEarnings = referrals.reduce((sum, ref) => sum + ref.earnings.totalEarnings, 0);
    const depositEarnings = referrals.reduce((sum, ref) => sum + ref.earnings.depositEarnings, 0);
    const taskEarnings = referrals.reduce((sum, ref) => sum + ref.earnings.taskEarnings, 0);

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        depositEarnings,
        taskEarnings,
        totalReferrals: referrals.length,
        activeReferrals: referrals.filter((r) => r.status === 'active').length,
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

// @desc    Apply referral code (called during registration)
// @route   POST /api/referrals/apply-code
// @access  Public
export const applyReferralCode = async (req, res) => {
  try {
    const { referralCode, userId } = req.body;

    if (!referralCode || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Referral code and user ID are required',
      });
    }

    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
    }

    if (referrer._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot use your own referral code',
      });
    }

    // Check if already referred
    const existingReferral = await Referral.findOne({ referred: userId });
    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: 'User already has a referrer',
      });
    }

    // Create referral
    const referral = await Referral.create({
      referrer: referrer._id,
      referred: userId,
      referralCode,
      status: 'active',
    });

    // Update user
    await User.findByIdAndUpdate(userId, {
      referredBy: referrer._id,
    });

    // Notify referrer
    const referredUser = await User.findById(userId);
    await createNotification(
      referrer._id,
      'referral',
      'New Referral',
      `${referredUser.name} joined using your referral code!`,
      { link: '/referrals' }
    );

    res.status(200).json({
      success: true,
      message: 'Referral code applied successfully',
      data: { referral },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Helper function to process referral earnings (called when deposit or task completed)
export const processReferralEarnings = async (userId, type, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.referredBy) return;

    const referral = await Referral.findOne({
      referrer: user.referredBy,
      referred: userId,
    });

    if (!referral || referral.status !== 'active') return;

    const commissionRate = 0.05; // 5% commission
    const commission = amount * commissionRate;

    if (type === 'deposit') {
      referral.earnings.depositEarnings += commission;
      if (!referral.firstDepositDate) {
        referral.firstDepositDate = new Date();
      }
    } else if (type === 'task') {
      referral.earnings.taskEarnings += commission;
      if (!referral.firstTaskDate) {
        referral.firstTaskDate = new Date();
      }
    }

    referral.earnings.totalEarnings += commission;
    await referral.save();

    // Add to referrer's wallet
    const referrer = await User.findById(user.referredBy);
    referrer.walletBalance += commission;
    referrer.totalEarnings += commission;
    await referrer.save();

    // Create transaction for referrer
    await Transaction.create({
      user: referrer._id,
      type: 'referral',
      amount: commission,
      status: 'completed',
      description: `Referral commission from ${user.name}`,
      metadata: { referredUserId: userId, originalAmount: amount, type },
    });

    // Notify referrer
    await createNotification(
      referrer._id,
      'referral',
      'Referral Earnings',
      `You earned $${commission.toFixed(2)} from referral!`,
      { link: '/referrals' }
    );
  } catch (error) {
    console.error('Error processing referral earnings:', error);
  }
};

