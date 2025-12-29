import User from '../models/User.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import Transaction from '../models/Transaction.js';

// @desc    Get public statistics
// @route   GET /api/stats/public
// @access  Public
export const getPublicStats = async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalTasksDone = await Work.countDocuments({ status: 'approved' });
    
    const totalPaid = await Transaction.aggregate([
      { $match: { type: 'earning', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalPaidAmount = totalPaid[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        jobPosted: totalJobs,
        totalUser: totalUsers,
        taskDone: totalTasksDone,
        paid: totalPaidAmount,
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

