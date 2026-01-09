import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import Referral from '../models/Referral.js';
import Transaction from '../models/Transaction.js';

// @desc    Get my profile
// @route   GET /api/users/profile
// @access  Private
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    // Get additional stats
    const stats = {
      postedJobs: await Job.countDocuments({ employer: req.user._id }),
      activeJobs: await Job.countDocuments({
        employer: req.user._id,
        status: { $in: ['open', 'in-progress'] }
      }),
      completedWorks: await Work.countDocuments({
        worker: req.user._id,
        status: 'approved'
      }),
      pendingWorks: await Work.countDocuments({
        worker: req.user._id,
        status: { $in: ['pending', 'in-progress', 'submitted'] }
      }),
      totalReferrals: await Referral.countDocuments({ referrer: req.user._id }),
      totalDeposits: await Transaction.aggregate([
        { $match: { user: req.user._id, type: 'deposit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then(result => result[0]?.total || 0),
      totalWithdrawals: await Transaction.aggregate([
        { $match: { user: req.user._id, type: 'withdrawal', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then(result => result[0]?.total || 0),
    };

    res.status(200).json({
      success: true,
      data: {
        user,
        stats,
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

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, skills, profilePicture, age, country, securityCode } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (age) updateData.age = age;
    if (country) updateData.country = country;
    if (securityCode) updateData.securityCode = securityCode;
    if (bio !== undefined) updateData.bio = bio;
    if (skills) updateData.skills = skills;
    if (profilePicture) updateData.profilePicture = profilePicture;


    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get public profile
// @route   GET /api/users/:id/public
// @access  Public
export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'name email profilePicture bio skills rating completedJobs createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

