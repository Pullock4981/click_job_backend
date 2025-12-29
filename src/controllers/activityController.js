import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';

// @desc    Get recent activity feed
// @route   GET /api/activity/recent
// @access  Public
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const activities = await Activity.find({ isPublic: true })
      .populate('user', 'name profilePicture')
      .populate('job', 'title budget')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Format activity data
    const formattedActivities = activities.map((activity) => {
      const data = {
        id: activity._id,
        userName: activity.user.name,
        userProfilePicture: activity.user.profilePicture,
        type: activity.type,
        createdAt: activity.createdAt,
        timeAgo: getTimeAgo(activity.createdAt),
      };

      if (activity.job) {
        data.jobTitle = activity.job.title;
        data.jobId = activity.job._id;
      }

      if (activity.progress && activity.progress.total > 0) {
        data.progress = `${activity.progress.current} OF ${activity.progress.total}`;
      }

      if (activity.amount > 0) {
        data.amount = activity.amount.toFixed(3);
      }

      if (activity.message) {
        data.message = activity.message;
      }

      return data;
    });

    res.status(200).json({
      success: true,
      data: { activities: formattedActivities },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

// @desc    Create activity (internal use)
// @route   Internal function
export const createActivity = async (userId, type, options = {}) => {
  try {
    const activityData = {
      user: userId,
      type,
      isPublic: options.isPublic !== false,
    };

    if (options.job) activityData.job = options.job;
    if (options.work) activityData.work = options.work;
    if (options.progress) activityData.progress = options.progress;
    if (options.amount) activityData.amount = options.amount;
    if (options.message) activityData.message = options.message;

    const activity = await Activity.create(activityData);
    return activity;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
};

