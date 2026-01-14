import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../utils/sendNotification.js';

const PLAN_FEATURES = {
  basic: {
    price: 0,
    features: ['basic_job_posting', 'limited_applications'],
  },
  premium: {
    price: 9.99,
    features: [
      'unlimited_job_posting',
      'priority_support',
      'advanced_analytics',
      'featured_jobs',
    ],
  },
  pro: {
    price: 19.99,
    features: [
      'unlimited_job_posting',
      'priority_support',
      'advanced_analytics',
      'featured_jobs',
      'custom_branding',
      'api_access',
    ],
  },
};

// @desc    Get my subscription
// @route   GET /api/subscriptions/my-plan
// @access  Private
export const getMySubscription = async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ user: req.user._id });

    if (!subscription) {
      // Create basic subscription if doesn't exist
      subscription = await Subscription.create({
        user: req.user._id,
        plan: 'basic',
        status: 'active',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        subscription,
        features: PLAN_FEATURES[subscription.plan].features,
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

// @desc    Get available plans
// @route   GET /api/subscriptions/plans
// @access  Public
export const getPlans = async (req, res) => {
  try {
    const plans = Object.keys(PLAN_FEATURES).map((key) => ({
      plan: key,
      ...PLAN_FEATURES[key],
    }));

    res.status(200).json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Subscribe to plan
// @route   POST /api/subscriptions/subscribe
// @access  Private
export const subscribe = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLAN_FEATURES[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan',
      });
    }

    const planDetails = PLAN_FEATURES[plan];
    const user = await User.findById(req.user._id);

    // Check if user has enough balance (for paid plans)
    if (planDetails.price > 0 && user.depositBalance < planDetails.price) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient deposit balance',
      });
    }

    // Deduct payment if paid plan
    let transaction = null;
    if (planDetails.price > 0) {
      user.depositBalance -= planDetails.price;
      await user.save();

      transaction = await Transaction.create({
        user: req.user._id,
        type: 'payment',
        amount: planDetails.price,
        status: 'completed',
        description: `Subscription payment for ${plan} plan`,
      });
    }

    // Update or create subscription
    let subscription = await Subscription.findOne({ user: req.user._id });

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    if (subscription) {
      subscription.plan = plan;
      subscription.status = 'active';
      subscription.startDate = new Date();
      subscription.endDate = endDate;
      subscription.features = planDetails.features;
      subscription.price = planDetails.price;
      subscription.paymentTransaction = transaction?._id || null;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        user: req.user._id,
        plan,
        status: 'active',
        startDate: new Date(),
        endDate,
        features: planDetails.features,
        price: planDetails.price,
        paymentTransaction: transaction?._id || null,
      });
    }

    // Update user isPremium status
    user.isPremium = plan !== 'basic';
    await user.save();

    // Notify user
    await createNotification(
      req.user._id,
      'system',
      'Subscription Activated',
      `Your ${plan} subscription has been activated!`,
      { link: '/subscription' }
    );

    res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: { subscription, features: planDetails.features },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/cancel
// @access  Private
export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();

    // Update user
    const user = await User.findById(req.user._id);
    user.isPremium = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: { subscription },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

