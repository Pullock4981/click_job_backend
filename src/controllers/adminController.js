import User from '../models/User.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import Transaction from '../models/Transaction.js';
import Ticket from '../models/Ticket.js';
import { issueWarning, resolveWarning } from '../utils/accountHealth.js';
import { createNotification } from '../utils/sendNotification.js';

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
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

// @desc    Get single user (Admin)
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user stats
    const stats = {
      postedJobs: await Job.countDocuments({ employer: user._id }),
      completedWorks: await Work.countDocuments({
        worker: user._id,
        status: 'approved',
      }),
      totalEarnings: user.totalEarnings,
      walletBalance: user.walletBalance,
      totalTransactions: await Transaction.countDocuments({ user: user._id }),
    };

    res.status(200).json({
      success: true,
      data: { user, stats },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user (Admin)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const { name, email, role, isVerified, isPremium, walletBalance } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent changing own role
    if (req.user._id.toString() === req.params.id && role && role !== user.role) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (isPremium !== undefined) updateData.isPremium = isPremium;
    if (walletBalance !== undefined) updateData.walletBalance = walletBalance;

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting own account
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Issue warning to user (Admin)
// @route   POST /api/admin/users/:id/warning
// @access  Private (Admin)
export const issueUserWarning = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required',
      });
    }

    const accountHealth = await issueWarning(req.params.id, reason);

    if (!accountHealth) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Notify user
    await createNotification(
      req.params.id,
      'system',
      'Account Warning',
      `You have received a warning: ${reason}. Your account health is now ${accountHealth.percentage}%.`,
      { link: '/dashboard' }
    );

    res.status(200).json({
      success: true,
      message: 'Warning issued successfully',
      data: { accountHealth },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all jobs (Admin)
// @route   GET /api/admin/jobs
// @access  Private (Admin)
export const getAllJobs = async (req, res) => {
  try {
    const { status, category, employer, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (employer) query.employer = employer;

    const jobs = await Job.find(query)
      .populate('employer', 'name email profilePicture')
      .populate('assignedTo', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        jobs,
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

// @desc    Update job (Admin)
// @route   PUT /api/admin/jobs/:id
// @access  Private (Admin)
export const updateJobAdmin = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('employer', 'name email')
      .populate('assignedTo', 'name email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: { job },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete job (Admin)
// @route   DELETE /api/admin/jobs/:id
// @access  Private (Admin)
export const deleteJobAdmin = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get system stats (Admin)
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEmployers = await User.countDocuments({ role: 'employer' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: { $in: ['open', 'in-progress'] } });
    const completedJobs = await Job.countDocuments({ status: 'completed' });
    const totalWorks = await Work.countDocuments();
    const completedWorks = await Work.countDocuments({ status: 'approved' });

    const totalTransactions = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalVolume = totalTransactions[0]?.total || 0;

    const totalDeposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalDepositAmount = totalDeposits[0]?.total || 0;

    const totalEarnings = await Transaction.aggregate([
      { $match: { type: 'earning', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalEarningsAmount = totalEarnings[0]?.total || 0;

    const openTickets = await Ticket.countDocuments({ status: 'open' });
    const totalTickets = await Ticket.countDocuments();

    // Graph Data: Last 7 days
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const graphData = await Promise.all(last7Days.map(async (date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayUsers = await User.countDocuments({ createdAt: { $gte: date, $lt: nextDay } });
      const dayEarnings = await Transaction.aggregate([
        { $match: { type: 'earning', status: 'completed', createdAt: { $gte: date, $lt: nextDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        users: dayUsers,
        earnings: dayEarnings[0]?.total || 0,
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          employers: totalEmployers,
          admins: totalAdmins,
          regular: totalUsers - totalEmployers - totalAdmins,
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          completed: completedJobs,
          cancelled: totalJobs - activeJobs - completedJobs,
        },
        works: {
          total: totalWorks,
          completed: completedWorks,
          pending: totalWorks - completedWorks,
        },
        transactions: {
          totalVolume,
          totalDeposits: totalDepositAmount,
          totalEarnings: totalEarningsAmount,
        },
        support: {
          openTickets,
          totalTickets,
        },
        graphData,
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

