import User from '../models/User.js';
import HeaderNotice from '../models/HeaderNotice.js';
import VerificationRequest from '../models/VerificationRequest.js';
import CounterInfo from '../models/CounterInfo.js';
import ContactInfo from '../models/ContactInfo.js';
import ContactMessage from '../models/ContactMessage.js';
import GoogleAd from '../models/GoogleAd.js';
import Service from '../models/Service.js';
import PremiumPackage from '../models/PremiumPackage.js';
import Subscription from '../models/Subscription.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import Transaction from '../models/Transaction.js';
import Ticket from '../models/Ticket.js';
import DepositMethod from '../models/DepositMethod.js';
import WithdrawMethod from '../models/WithdrawMethod.js';
import SMMCategory from '../models/SMMCategory.js';
import SMMService from '../models/SMMService.js';
import SMMRequest from '../models/SMMRequest.js';
import Headline from '../models/Headline.js';
import ReferralSetting from '../models/ReferralSetting.js';
import JobCategory from '../models/JobCategory.js';
import JobSubCategory from '../models/JobSubCategory.js';
import Country from '../models/Country.js';
import LocationZone from '../models/LocationZone.js';
import AppSettings from '../models/AppSettings.js';
import SpinSetting from '../models/SpinSetting.js';
import CustomScript from '../models/CustomScript.js';
import AdminMessage from '../models/AdminMessage.js';
import WebsiteInfo from '../models/WebsiteInfo.js';
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
      earningBalance: user.earningBalance,
      depositBalance: user.depositBalance,
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
    const { name, email, role, isVerified, isPremium, earningBalance, depositBalance } = req.body;

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
    if (earningBalance !== undefined) updateData.earningBalance = earningBalance;
    if (depositBalance !== undefined) updateData.depositBalance = depositBalance;

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

// @desc    Get all admins
// @route   GET /api/admin/accounts
// @access  Private (Admin)
export const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: admins.map(admin => ({
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        type: admin.role === 'superadmin' ? 'Super Admin' : 'Admin',
        status: admin.status ? (admin.status.charAt(0).toUpperCase() + admin.status.slice(1)) : 'Active'
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new admin
// @route   POST /api/admin/accounts
// @access  Private (Admin)
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, type, status } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: type === 'Super Admin' ? 'superadmin' : 'admin',
      phone,
      status: status ? status.toLowerCase() : 'active',
      isVerified: true
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        type: user.role === 'superadmin' ? 'Super Admin' : 'Admin',
        status: user.status ? (user.status.charAt(0).toUpperCase() + user.status.slice(1)) : 'Active'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update admin
// @route   PUT /api/admin/accounts/:id
// @access  Private (Admin)
export const updateAdminAccount = async (req, res) => {
  try {
    const { name, email, phone, type, status, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (type) user.role = type === 'Super Admin' ? 'superadmin' : 'admin';
    if (status) user.status = status.toLowerCase();
    if (password) {
      user.password = password;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        type: user.role === 'superadmin' ? 'Super Admin' : 'Admin',
        status: user.status ? (user.status.charAt(0).toUpperCase() + user.status.slice(1)) : 'Active'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admin/accounts/:id
// @access  Private (Admin)
export const deleteAdminAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'Admin removed' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get Header Info & Notice
// @route   GET /api/admin/header-notice
// @access  Private (Admin)
export const getHeaderNotice = async (req, res) => {
  try {
    let notice = await HeaderNotice.findOne();
    if (!notice) {
      notice = await HeaderNotice.create({});
    }
    res.status(200).json({ success: true, data: notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Header Info & Notice
// @route   PUT /api/admin/header-notice
// @access  Private (Admin)
export const updateHeaderNotice = async (req, res) => {
  try {
    const updates = req.body;
    let notice = await HeaderNotice.findOne();
    if (!notice) {
      notice = await HeaderNotice.create(updates);
    } else {
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          notice[key] = updates[key];
        }
      });
      await notice.save();
    }
    res.status(200).json({ success: true, data: notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Verification Requests
// @route   GET /api/admin/verification-requests
// @access  Private (Admin)
export const getVerificationRequests = async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ status: 'Pending' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const formatted = requests.map(req => ({
      id: req._id,
      name: req.user ? req.user.name : 'Unknown',
      userImage: req.userImage,
      frontImage: req.frontImage,
      cardNumber: req.cardNumber,
      documentType: req.documentType,
      status: req.status
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Counter Info
// @route   GET /api/admin/counter-info
// @access  Private (Admin)
export const getCounterInfo = async (req, res) => {
  try {
    let info = await CounterInfo.findOne();
    if (!info) {
      info = await CounterInfo.create({
        totalJobs: { text: 'Job Posted', count: 0 },
        totalUsers: { text: 'Total User', count: 0 },
        taskDone: { text: 'Task Done', count: 0 },
        paid: { text: 'Paid $', count: 0 }
      });
    }
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Counter Info
// @route   PUT /api/admin/counter-info
// @access  Private (Admin)
export const updateCounterInfo = async (req, res) => {
  try {
    const updates = req.body;
    let info = await CounterInfo.findOne();
    if (!info) {
      info = await CounterInfo.create(updates);
    } else {
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          info[key] = { ...info[key], ...updates[key] };
        }
      });
      await info.save();
    }
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Contact Info
// @route   GET /api/admin/contact-info
// @access  Private (Admin)
export const getContactInfo = async (req, res) => {
  try {
    let info = await ContactInfo.findOne();
    if (!info) {
      info = await ContactInfo.create({});
    }
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Contact Info
// @route   PUT /api/admin/contact-info
// @access  Private (Admin)
export const updateContactInfo = async (req, res) => {
  try {
    const updates = req.body;
    let info = await ContactInfo.findOne();
    if (!info) {
      info = await ContactInfo.create(updates);
    } else {
      Object.assign(info, updates);
      await info.save();
    }
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Contact Messages
// @route   GET /api/admin/contact-messages
// @access  Private (Admin)
export const getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Contact Message
// @route   DELETE /api/admin/contact-messages/:id
// @access  Private (Admin)
export const deleteContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Google Ads
// @route   GET /api/admin/google-ads
// @access  Private (Admin)
export const getGoogleAds = async (req, res) => {
  try {
    const ads = await GoogleAd.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: ads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Google Ad
// @route   POST /api/admin/google-ads
// @access  Private (Admin)
export const createGoogleAd = async (req, res) => {
  try {
    const ad = await GoogleAd.create(req.body);
    res.status(201).json({ success: true, data: ad });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Google Ad
// @route   PUT /api/admin/google-ads/:id
// @access  Private (Admin)
export const updateGoogleAd = async (req, res) => {
  try {
    const ad = await GoogleAd.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }
    res.status(200).json({ success: true, data: ad });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Google Ad
// @route   DELETE /api/admin/google-ads/:id
// @access  Private (Admin)
export const deleteGoogleAd = async (req, res) => {
  try {
    const ad = await GoogleAd.findByIdAndDelete(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }
    res.status(200).json({ success: true, message: 'Ad deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Service Controllers ---

export const getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Premium Package Controllers ---

export const getPremiumPackages = async (req, res) => {
  try {
    const packages = await PremiumPackage.find().sort({ cost: 1 });
    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPremiumPackage = async (req, res) => {
  try {
    const pkg = await PremiumPackage.create(req.body);
    res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePremiumPackage = async (req, res) => {
  try {
    const pkg = await PremiumPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePremiumPackage = async (req, res) => {
  try {
    await PremiumPackage.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Package deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Premium User Controllers ---

export const getPremiumUsers = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ status: 'active' }).populate('user', 'name email phone avatar balance');
    res.status(200).json({ success: true, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Job Approval Controllers ---

export const getApprovalJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ adminStatus: 'pending' }).populate('employer', 'name email');
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, {
      adminStatus: 'approved',
      status: 'open'
    }, { new: true });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectJob = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.adminStatus === 'pending') {
      const user = await User.findById(job.employer);
      if (user) {
        user.depositBalance += job.budget;
        await user.save();

        // Create refund transaction
        await Transaction.create({
          user: user._id,
          type: 'deposit',
          amount: job.budget,
          status: 'completed',
          description: `Refund for rejected job: ${job.title}`,
          relatedJob: job._id
        });
      }
    }

    job.adminStatus = 'rejected';
    job.adminRemark = reason;
    await job.save();

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Job Delete Request Controllers ---

export const getDeleteRequestJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ deleteRequested: true }).populate('employer', 'name email');
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Job Work Controllers ---

export const getJobWorks = async (req, res) => {
  try {
    const works = await Work.find()
      .populate('job', 'title')
      .populate('worker', 'name email')
      .populate('employer', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: works });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Deposit Method Controllers ---

export const getDepositMethods = async (req, res) => {
  try {
    const methods = await DepositMethod.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: methods });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepositMethod = async (req, res) => {
  try {
    const method = await DepositMethod.create(req.body);
    res.status(201).json({ success: true, data: method });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDepositMethod = async (req, res) => {
  try {
    await DepositMethod.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Method deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Deposit Request Controllers ---

export const getDepositRequests = async (req, res) => {
  try {
    const requests = await Transaction.find({ type: 'deposit' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Withdraw Method Controllers ---

export const getWithdrawMethods = async (req, res) => {
  try {
    const methods = await WithdrawMethod.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: methods });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createWithdrawMethod = async (req, res) => {
  try {
    const method = await WithdrawMethod.create(req.body);
    res.status(201).json({ success: true, data: method });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWithdrawMethod = async (req, res) => {
  try {
    await WithdrawMethod.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Method deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Withdraw Request Controllers ---

export const getWithdrawRequests = async (req, res) => {
  try {
    const requests = await Transaction.find({ type: 'withdrawal' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const oldTransaction = await Transaction.findById(req.params.id);

    if (!oldTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const transaction = await Transaction.findByIdAndUpdate(req.params.id, { status }, { new: true });

    // If approved deposit, add to depositBalance
    if (status === 'completed' && transaction.type === 'deposit' && oldTransaction.status !== 'completed') {
      const user = await User.findById(transaction.user);
      if (user) {
        user.depositBalance += transaction.amount;
        await user.save();
      }
    }

    // If failed/rejected withdrawal, refund to earningBalance
    if ((status === 'failed' || status === 'rejected') && transaction.type === 'withdrawal' && oldTransaction.status === 'pending') {
      const user = await User.findById(transaction.user);
      if (user) {
        user.earningBalance += transaction.amount;
        await user.save();
      }
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- SMM Category Controllers ---

export const getSMMCategoroies = async (req, res) => {
  try {
    const categories = await SMMCategory.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSMMCategory = async (req, res) => {
  try {
    const category = await SMMCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSMMCategory = async (req, res) => {
  try {
    await SMMCategory.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- SMM Service Controllers ---

export const getSMMServices = async (req, res) => {
  try {
    const services = await SMMService.find().populate('category', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSMMService = async (req, res) => {
  try {
    const service = await SMMService.create(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSMMService = async (req, res) => {
  try {
    await SMMService.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- SMM Request Controllers ---

export const getSMMRequests = async (req, res) => {
  try {
    const requests = await SMMRequest.find()
      .populate('user', 'name email')
      .populate('service', 'title chargePer1000')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSMMRequestStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const request = await SMMRequest.findByIdAndUpdate(req.params.id, { status, reason }, { new: true });
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Headline Controllers ---

export const getHeadlines = async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    const headlines = await Headline.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: headlines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHeadline = async (req, res) => {
  try {
    const headline = await Headline.create(req.body);
    res.status(201).json({ success: true, data: headline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteHeadline = async (req, res) => {
  try {
    await Headline.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Headline deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Top Reports Controllers ---

export const getTopWorkers = async (req, res) => {
  try {
    const workers = await Work.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$worker', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          count: 1,
          name: '$user.name',
          email: '$user.email'
        }
      }
    ]);
    res.status(200).json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTopJobPosters = async (req, res) => {
  try {
    const posters = await Job.aggregate([
      { $group: { _id: '$employer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          count: 1,
          name: '$user.name',
          email: '$user.email'
        }
      }
    ]);
    res.status(200).json({ success: true, data: posters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTopDepositors = async (req, res) => {
  try {
    const depositors = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: '$user', amount: { $sum: '$amount' } } },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, amount: 1, name: '$user.name' } }
    ]);
    res.status(200).json({ success: true, data: depositors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTopBestUsers = async (req, res) => {
  try {
    const users = await User.find({ earningBalance: { $gt: 0 } })
      .sort({ earningBalance: -1 })
      .limit(10)
      .select('name earningBalance');

    const formatted = users.map(u => ({
      _id: u._id,
      name: u.name,
      amount: u.earningBalance
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTopReferrers = async (req, res) => {
  try {
    const referrers = await User.aggregate([
      { $project: { name: 1, referralCount: { $size: { $ifNull: ["$referrals", []] } } } },
      { $sort: { referralCount: -1 } },
      { $limit: 10 }
    ]);
    res.status(200).json({ success: true, data: referrers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- System Setting Controllers ---

// Referral Settings
export const getReferralSettings = async (req, res) => {
  try {
    const settings = await ReferralSetting.find().sort({ generation: 1 });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReferralSetting = async (req, res) => {
  try {
    const setting = await ReferralSetting.create(req.body);
    res.status(201).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReferralSetting = async (req, res) => {
  try {
    await ReferralSetting.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Settings deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Job Categories
export const getJobCategories = async (req, res) => {
  try {
    const categories = await JobCategory.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createJobCategory = async (req, res) => {
  try {
    const category = await JobCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJobCategory = async (req, res) => {
  try {
    const category = await JobCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteJobCategory = async (req, res) => {
  try {
    await JobCategory.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Job Sub Categories
export const getJobSubCategories = async (req, res) => {
  try {
    const subCategories = await JobSubCategory.find().populate('category').sort({ name: 1 });
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createJobSubCategory = async (req, res) => {
  try {
    const subCategory = await JobSubCategory.create(req.body);
    res.status(201).json({ success: true, data: subCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJobSubCategory = async (req, res) => {
  try {
    const subCategory = await JobSubCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: subCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteJobSubCategory = async (req, res) => {
  try {
    await JobSubCategory.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Sub category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Countries
export const getCountries = async (req, res) => {
  try {
    const countries = await Country.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: countries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCountry = async (req, res) => {
  try {
    const country = await Country.create(req.body);
    res.status(201).json({ success: true, data: country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    await Country.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Country deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Location Zones
export const getLocationZones = async (req, res) => {
  try {
    const zones = await LocationZone.find().populate('country').sort({ name: 1 });
    res.status(200).json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLocationZone = async (req, res) => {
  try {
    const zone = await LocationZone.create(req.body);
    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocationZone = async (req, res) => {
  try {
    const zone = await LocationZone.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: zone });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLocationZone = async (req, res) => {
  try {
    await LocationZone.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Zone deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// App Settings (Default Setup)
export const getAppSettings = async (req, res) => {
  try {
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAppSettings = async (req, res) => {
  try {
    const settings = await AppSettings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Spin Settings
export const getSpinSettings = async (req, res) => {
  try {
    let settings = await SpinSetting.findOne();
    if (!settings) {
      settings = await SpinSetting.create({
        parts: Array(7).fill({ bg: '#ffffff', mark: 0 })
      });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSpinSettings = async (req, res) => {
  try {
    const settings = await SpinSetting.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Custom Scripts
export const getCustomScripts = async (req, res) => {
  try {
    const scripts = await CustomScript.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: scripts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomScript = async (req, res) => {
  try {
    const script = await CustomScript.create(req.body);
    res.status(201).json({ success: true, data: script });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomScript = async (req, res) => {
  try {
    await CustomScript.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Script deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Messages (User Message)
export const getAdminMessages = async (req, res) => {
  try {
    const messages = await AdminMessage.find().populate('user', 'name').sort({ date: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendAdminMessage = async (req, res) => {
  try {
    const { user, message } = req.body;
    const adminMsg = await AdminMessage.create({ user, message });

    // Also create a notification for the user
    await createNotification({
      user,
      type: 'system',
      title: 'Message from Admin',
      message
    });

    res.status(201).json({ success: true, data: adminMsg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAdminMessage = async (req, res) => {
  try {
    await AdminMessage.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Website Info
export const getWebsiteInfo = async (req, res) => {
  try {
    let info = await WebsiteInfo.findOne();
    if (!info) {
      info = await WebsiteInfo.create({});
    }
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWebsiteInfo = async (req, res) => {
  try {
    const info = await WebsiteInfo.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get duplicate users (same IP)
// @route   GET /api/admin/users/duplicate
// @access  Private (Admin)
export const getDuplicateUsers = async (req, res) => {
  try {
    const duplicates = await User.aggregate([
      // Get the last login entry
      { $addFields: { lastLogin: { $last: "$loginHistory" } } },
      // Group by IP
      {
        $group: {
          _id: "$lastLogin.ip",
          users: {
            $push: {
              _id: "$_id",
              name: "$name",
              email: "$email",
              password: "$password",
              role: "$role",
              status: "$status",
              isVerified: "$isVerified",
              depositBalance: "$depositBalance",
              earningBalance: "$earningBalance",
              bio: "$bio",
              referrer: "$referrer",
              loginHistory: "$loginHistory"
            }
          },
          count: { $sum: 1 }
        }
      },
      // Filter where count > 1 and IP is not null/empty
      {
        $match: {
          count: { $gt: 1 },
          _id: { $ne: null, $ne: "" }
        }
      }
    ]);

    // Flatten the list for the frontend table
    let duplicateUsers = [];
    duplicates.forEach(group => {
      // Add IP info to each user object for display if needed
      const usersWithIp = group.users.map(u => ({ ...u, matchedIp: group._id }));
      duplicateUsers = [...duplicateUsers, ...usersWithIp];
    });

    res.status(200).json({
      success: true,
      data: { users: duplicateUsers }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

