import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import Referral from '../models/Referral.js';

// @desc    Get top depositors
// @route   GET /api/leaderboard/top-depositors
// @access  Public
export const getTopDepositors = async (req, res) => {
  try {
    const { period = 'all', limit = 100 } = req.query;

    let dateFilter = {};
    if (period === 'daily') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    } else if (period === 'weekly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'monthly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const query = { type: 'deposit', status: 'completed', ...dateFilter };

    const leaderboard = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$user',
          totalDeposits: { $sum: '$amount' },
          depositCount: { $sum: 1 },
        },
      },
      { $sort: { totalDeposits: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          profilePicture: '$user.profilePicture',
          totalDeposits: 1,
          depositCount: 1,
          rank: { $add: [{ $indexOfArray: [{ $sortArray: { input: '$totalDeposits', sortBy: -1 } }, '$totalDeposits'] }, 1] },
        },
      },
    ]);

    // Add rank manually
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.status(200).json({
      success: true,
      data: { leaderboard, period },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get top workers
// @route   GET /api/leaderboard/top-workers
// @access  Public
export const getTopWorkers = async (req, res) => {
  try {
    const { period = 'all', limit = 100 } = req.query;

    let dateFilter = {};
    if (period === 'daily') {
      dateFilter = { paidAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    } else if (period === 'weekly') {
      dateFilter = { paidAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'monthly') {
      dateFilter = { paidAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const query = { status: 'approved', paymentStatus: 'paid', ...dateFilter };

    const leaderboard = await Work.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$worker',
          totalEarnings: { $sum: '$paymentAmount' },
          completedJobs: { $sum: 1 },
          avgRating: { $avg: '$rating' },
        },
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          profilePicture: '$user.profilePicture',
          rating: '$user.rating',
          totalEarnings: 1,
          completedJobs: 1,
          avgRating: { $round: ['$avgRating', 2] },
        },
      },
    ]);

    // Add rank
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.status(200).json({
      success: true,
      data: { leaderboard, period },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get top job posters
// @route   GET /api/leaderboard/top-job-posters
// @access  Public
export const getTopJobPosters = async (req, res) => {
  try {
    const { period = 'all', limit = 100 } = req.query;

    let dateFilter = {};
    if (period === 'daily') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    } else if (period === 'weekly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'monthly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const query = { ...dateFilter };

    const leaderboard = await Job.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$employer',
          totalJobs: { $sum: 1 },
          totalBudget: { $sum: '$budget' },
          completedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalJobs: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          profilePicture: '$user.profilePicture',
          totalJobs: 1,
          totalBudget: 1,
          completedJobs: 1,
        },
      },
    ]);

    // Add rank
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.status(200).json({
      success: true,
      data: { leaderboard, period },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get top referrers
// @route   GET /api/leaderboard/top-referrers
// @access  Public
export const getTopReferrers = async (req, res) => {
  try {
    const { period = 'all', limit = 100 } = req.query;

    let dateFilter = {};
    if (period === 'daily') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    } else if (period === 'weekly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'monthly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const query = { status: 'active', ...dateFilter };

    const leaderboard = await Referral.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$referrer',
          totalReferrals: { $sum: 1 },
          totalEarnings: { $sum: '$earnings.totalEarnings' },
          depositEarnings: { $sum: '$earnings.depositEarnings' },
          taskEarnings: { $sum: '$earnings.taskEarnings' },
        },
      },
      { $sort: { totalReferrals: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          profilePicture: '$user.profilePicture',
          referralCode: '$user.referralCode',
          totalReferrals: 1,
          totalEarnings: 1,
          depositEarnings: 1,
          taskEarnings: 1,
        },
      },
    ]);

    // Add rank
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.status(200).json({
      success: true,
      data: { leaderboard, period },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get top users (general ranking)
// @route   GET /api/leaderboard/top-users
// @access  Public
export const getTopUsers = async (req, res) => {
  try {
    const { sortBy = 'totalEarnings', limit = 100 } = req.query;

    const sortField = sortBy === 'totalEarnings' ? 'totalEarnings' : 
                     sortBy === 'completedJobs' ? 'completedJobs' : 
                     sortBy === 'rating' ? 'rating' : 'totalEarnings';

    const leaderboard = await User.find({})
      .select('name email profilePicture totalEarnings completedJobs rating activeJobs createdAt')
      .sort({ [sortField]: -1 })
      .limit(Number(limit));

    // Add rank and format
    const formattedLeaderboard = leaderboard.map((user, index) => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
      totalEarnings: user.totalEarnings,
      completedJobs: user.completedJobs,
      activeJobs: user.activeJobs,
      rating: user.rating,
      createdAt: user.createdAt,
      rank: index + 1,
    }));

    res.status(200).json({
      success: true,
      data: { leaderboard: formattedLeaderboard, sortBy },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get my rank in leaderboards
// @route   GET /api/leaderboard/my-rank
// @access  Private
export const getMyRank = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user stats
    const user = await User.findById(userId);

    // Calculate ranks
    const totalDeposits = await Transaction.aggregate([
      { $match: { user: userId, type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const userTotalDeposits = totalDeposits[0]?.total || 0;
    const depositorRank = await Transaction.countDocuments({
      type: 'deposit',
      status: 'completed',
      amount: { $gt: userTotalDeposits },
    }) + 1;

    const completedWorks = await Work.countDocuments({
      worker: userId,
      status: 'approved',
    });
    const workerRank = await Work.countDocuments({
      status: 'approved',
      paymentAmount: { $gt: user.totalEarnings },
    }) + 1;

    const postedJobs = await Job.countDocuments({ employer: userId });
    const jobPosterRank = await Job.countDocuments({
      employer: { $ne: userId },
      createdAt: { $lt: user.createdAt },
    }) + 1;

    const referrals = await Referral.countDocuments({ referrer: userId });
    const referrerRank = await Referral.countDocuments({
      referrer: { $ne: userId },
      'earnings.totalEarnings': { $gt: 0 },
    }) + 1;

    const userRank = await User.countDocuments({
      totalEarnings: { $gt: user.totalEarnings },
    }) + 1;

    res.status(200).json({
      success: true,
      data: {
        ranks: {
          depositor: depositorRank,
          worker: workerRank,
          jobPoster: jobPosterRank,
          referrer: referrerRank,
          user: userRank,
        },
        stats: {
          totalDeposits: userTotalDeposits,
          totalEarnings: user.totalEarnings,
          completedJobs: user.completedJobs,
          postedJobs,
          referrals,
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

