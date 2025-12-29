import User from '../models/User.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import Transaction from '../models/Transaction.js';

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Total Working Overview
    const taskAttend = await Work.countDocuments({ worker: userId });
    const satisfied = await Work.countDocuments({
      worker: userId,
      status: 'approved',
    });
    const notSatisfied = await Work.countDocuments({
      worker: userId,
      status: 'rejected',
    });
    const pending = await Work.countDocuments({
      worker: userId,
      status: { $in: ['pending', 'in-progress', 'submitted'] },
    });

    const paymentReceived = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'earning',
          status: 'completed',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalPayment = paymentReceived[0]?.total || 0;

    const lastTask = await Work.findOne({ worker: userId })
      .sort({ createdAt: -1 })
      .select('createdAt');

    // Total Job Overview (for employers)
    const validJobsPosted = await Job.countDocuments({
      employer: userId,
      status: { $in: ['open', 'in-progress'] },
    });

    const totalDeposit = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'deposit',
          status: 'completed',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalDepositAmount = totalDeposit[0]?.total || 0;

    const paid = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'payment',
          status: 'completed',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalPaid = paid[0]?.total || 0;

    const jobOver = await Job.countDocuments({
      employer: userId,
      status: 'completed',
    });

    // Working Status Chart Data (for donut chart)
    const workingStatusData = {
      satisfied: satisfied,
      unsatisfied: notSatisfied,
      pending: pending,
      total: taskAttend,
    };

    // Job Status Chart Data (for employers)
    const employerJobIds = await Job.find({ employer: userId }).distinct('_id');
    
    const jobSatisfied = await Work.countDocuments({
      job: { $in: employerJobIds },
      status: 'approved',
    });
    const jobNotSatisfied = await Work.countDocuments({
      job: { $in: employerJobIds },
      status: 'rejected',
    });
    const jobNotRated = await Work.countDocuments({
      job: { $in: employerJobIds },
      status: { $in: ['pending', 'in-progress', 'submitted'] },
    });

    const jobStatusData = {
      satisfied: jobSatisfied,
      notSatisfied: jobNotSatisfied,
      notRated: jobNotRated,
      total: jobSatisfied + jobNotSatisfied + jobNotRated,
    };

    // Calculate satisfaction percentage for jobs
    const jobSatisfactionPercentage =
      jobStatusData.total > 0
        ? ((jobSatisfied / jobStatusData.total) * 100).toFixed(2)
        : 0;

    // Account Health
    const user = await User.findById(userId);
    const accountHealth = user.accountHealth || {
      percentage: 100,
      warnings: [],
      lastWarningAt: null,
    };

    // Calculate health percentage based on warnings
    let healthPercentage = 100;
    const activeWarnings = accountHealth.warnings.filter(
      (w) => w.status === 'active'
    ).length;

    if (activeWarnings > 0) {
      healthPercentage = Math.max(0, 100 - activeWarnings * 10);
    }

    // Update account health percentage if needed
    if (user.accountHealth.percentage !== healthPercentage) {
      user.accountHealth.percentage = healthPercentage;
      await user.save();
    }

    // Login History
    const loginHistory = user.loginHistory || [];
    const currentIP =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection.remoteAddress ||
      'Unknown';

    res.status(200).json({
      success: true,
      data: {
        totalWorking: {
          taskAttend,
          satisfied,
          notSatisfied,
          pending,
          paymentReceived: totalPayment,
          lastTask: lastTask?.createdAt || null,
        },
        totalJob: {
          validJobsPosted,
          totalDeposit: totalDepositAmount,
          paid: totalPaid,
          jobOver,
        },
        charts: {
          workingStatus: workingStatusData,
          jobStatus: jobStatusData,
          jobSatisfactionPercentage: parseFloat(jobSatisfactionPercentage),
        },
        accountHealth: {
          percentage: healthPercentage,
          warnings: accountHealth.warnings.filter((w) => w.status === 'active'),
          totalWarnings: accountHealth.warnings.length,
          activeWarnings: activeWarnings,
          lastWarningAt: accountHealth.lastWarningAt,
        },
        loginHistory: {
          currentIP,
          history: loginHistory.slice(-10).reverse(), // Last 10 logins
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

