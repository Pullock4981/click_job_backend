import Work from '../models/Work.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../utils/sendNotification.js';
import { processReferralEarnings } from '../controllers/referralController.js';
import { createActivity } from './activityController.js';

// @desc    Get my works
// @route   GET /api/works/my-work
// @access  Private
export const getMyWorks = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { worker: req.user._id };
    if (status) query.status = status;

    const works = await Work.find(query)
      .populate('job', 'title description budget category')
      .populate('employer', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Work.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        works,
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

// @desc    Get single work
// @route   GET /api/works/:id
// @access  Private
export const getWork = async (req, res) => {
  try {
    const work = await Work.findById(req.params.id)
      .populate('job', 'title description budget category requirements')
      .populate('worker', 'name email profilePicture rating')
      .populate('employer', 'name email profilePicture rating');

    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work not found',
      });
    }

    // Check authorization
    if (
      work.worker._id.toString() !== req.user._id.toString() &&
      work.employer._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      data: { work },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Submit work
// @route   PUT /api/works/:id/submit
// @access  Private (Worker)
export const submitWork = async (req, res) => {
  try {
    const { submissionProof, submissionMessage, submissionFiles } = req.body;

    const work = await Work.findById(req.params.id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work not found',
      });
    }

    if (work.worker.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (work.status === 'approved' || work.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Work has already been reviewed',
      });
    }

    work.status = 'submitted';
    work.submissionProof = submissionProof || '';
    work.submissionMessage = submissionMessage || '';
    work.submissionFiles = submissionFiles || [];
    work.submissionDate = new Date();
    await work.save();

    // Create activity
    const job = await Job.findById(work.job);
    await createActivity(work.worker.toString(), 'work_submitted', {
      job: work.job,
      work: work._id,
      message: `Submitted work for: ${job.title}`,
      isPublic: false,
    });

    // Notify employer
    await createNotification(
      work.employer,
      'work_submitted',
      'Work Submitted',
      `Work has been submitted for job`,
      { link: `/works/${work._id}`, relatedWork: work._id }
    );

    res.status(200).json({
      success: true,
      message: 'Work submitted successfully',
      data: { work },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Approve work
// @route   PUT /api/works/:id/approve
// @access  Private (Employer)
export const approveWork = async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const work = await Work.findById(req.params.id).populate('job');

    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work not found',
      });
    }

    if (work.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (work.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Work is not submitted',
      });
    }

    work.status = 'approved';
    work.paymentStatus = 'paid';
    work.rating = rating || 0;
    work.employerFeedback = feedback || '';
    work.paidAt = new Date();
    await work.save();

    // Update job status (work.job is populated, so use _id)
    const job = await Job.findById(work.job._id || work.job);
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();

    // Update worker stats and wallet
    const worker = await User.findById(work.worker);
    worker.walletBalance += work.paymentAmount;
    worker.totalEarnings += work.paymentAmount;
    worker.completedJobs += 1;
    worker.activeJobs = Math.max(0, worker.activeJobs - 1);
    
    // Update rating
    const allWorks = await Work.find({ worker: work.worker, status: 'approved' });
    const avgRating = allWorks.reduce((sum, w) => sum + (w.rating || 0), 0) / allWorks.length;
    worker.rating = avgRating;
    await worker.save();

    // Create transaction
    await Transaction.create({
      user: work.worker,
      type: 'earning',
      amount: work.paymentAmount,
      status: 'completed',
      description: `Payment for completed job: ${job.title}`,
      relatedJob: job._id,
      relatedWork: work._id,
    });

    // Process referral earnings (5% commission to referrer)
    await processReferralEarnings(work.worker.toString(), 'task', work.paymentAmount);

    // Create activity (job already fetched above)
    await createActivity(work.worker.toString(), 'work_approved', {
      job: work.job,
      work: work._id,
      amount: work.paymentAmount,
      progress: {
        current: 1,
        total: 1,
      },
      message: `Completed: ${job.title}`,
      isPublic: true,
    });

    // Notify worker
    await createNotification(
      work.worker,
      'work_approved',
      'Work Approved',
      `Your work has been approved. Payment of $${work.paymentAmount} has been added to your wallet.`,
      { link: `/works/${work._id}`, relatedWork: work._id }
    );

    res.status(200).json({
      success: true,
      message: 'Work approved and payment processed',
      data: { work },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Reject work
// @route   PUT /api/works/:id/reject
// @access  Private (Employer)
export const rejectWork = async (req, res) => {
  try {
    const { feedback } = req.body;

    const work = await Work.findById(req.params.id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work not found',
      });
    }

    if (work.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (work.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Work is not submitted',
      });
    }

    work.status = 'rejected';
    work.employerFeedback = feedback || '';
    await work.save();

    // Update job status back to open
    const job = await Job.findById(work.job);
    job.status = 'open';
    job.assignedTo = null;
    await job.save();

    // Update worker stats
    await User.findByIdAndUpdate(work.worker, {
      $inc: { activeJobs: -1 },
    });

    // Notify worker
    await createNotification(
      work.worker,
      'work_rejected',
      'Work Rejected',
      `Your work has been rejected. Please review and resubmit.`,
      { link: `/works/${work._id}`, relatedWork: work._id }
    );

    res.status(200).json({
      success: true,
      message: 'Work rejected',
      data: { work },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

