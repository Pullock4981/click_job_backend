import Job from '../models/Job.js';
import { createNotification } from '../utils/sendNotification.js';

// @desc    Report a job
// @route   POST /api/jobs/:id/report
// @access  Private
export const reportJob = async (req, res) => {
  try {
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required',
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Check if user already reported this job
    const alreadyReported = job.reports.some(
      (report) => report.user.toString() === req.user._id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this job',
      });
    }

    // Add report
    job.reports.push({
      user: req.user._id,
      reason,
      description: description || '',
      status: 'pending',
    });

    await job.save();

    // Notify admins (you can add admin notification logic here)
    // For now, we'll just return success

    res.status(200).json({
      success: true,
      message: 'Job reported successfully. Our team will review it.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get job reports (Admin only)
// @route   GET /api/jobs/:id/reports
// @access  Private (Admin)
export const getJobReports = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('reports.user', 'name email profilePicture')
      .select('reports title');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        reports: job.reports,
        totalReports: job.reports.length,
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

// @desc    Update report status (Admin only)
// @route   PUT /api/jobs/:id/reports/:reportId
// @access  Private (Admin)
export const updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const report = job.reports.id(req.params.reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    report.status = status;
    await job.save();

    res.status(200).json({
      success: true,
      message: 'Report status updated',
      data: { report },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

