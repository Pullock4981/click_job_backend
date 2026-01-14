import Work from '../models/Work.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../utils/sendNotification.js';
import { processReferralEarnings } from '../controllers/referralController.js';
import { createActivity } from './activityController.js';

// @desc    Create work submission
// @route   POST /api/works/:jobId
// @access  Private (Worker)
// @desc    Create work submission (Directly Submit)
// @route   POST /api/works/:jobId/submit
// @access  Private (Worker)
export const createWorkSubmission = async (req, res) => {
  try {
    const { submissionMessage, submissionProof, submissionFiles } = req.body; // Changed from proofText, screenshots
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'open' && job.adminStatus !== 'approved') {
      return res.status(400).json({ success: false, message: 'Job is not available' });
    }

    if (job.workerNeed > 0 && (job.currentParticipants || 0) >= job.workerNeed) {
      return res.status(400).json({ success: false, message: 'Job is full' });
    }

    // Check if already submitted
    const existingWork = await Work.findOne({ job: jobId, worker: req.user._id });
    if (existingWork) {
      return res.status(400).json({ success: false, message: 'You have already submitted proof for this job' });
    }

    // Create Work directly as 'submitted'
    const work = await Work.create({
      job: jobId,
      worker: req.user._id,
      employer: job.employer,
      status: 'submitted', // Direct submission
      submissionProof: submissionProof || '',
      submissionMessage: submissionMessage || '',
      submissionFiles: submissionFiles || [],
      submissionDate: new Date(),
      paymentAmount: job.workerEarn
    });

    // Create Activity
    await createActivity(req.user._id, 'work_submitted', {
      job: job._id,
      work: work._id,
      message: `Submitted work for: ${job.title}`,
      isPublic: false,
    });

    // Notify Employer
    await createNotification(
      job.employer,
      'work_submitted',
      'New Work Submission',
      `${req.user.name} submitted proof for job: ${job.title}`,
      { link: `/works/employer`, relatedWork: work._id }
    );

    res.status(201).json({ success: true, message: 'Work submitted successfully', data: work });
  } catch (error) {
    console.error('Submission Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

// @desc    Get works for employer (review submissions)
// @route   GET /api/works/employer
// @access  Private (Employer)
export const getEmployerWorks = async (req, res) => {
  try {
    const works = await Work.find({ employer: req.user._id })
      .populate('job', 'title budget')
      .populate('worker', 'name numericId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: works });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    const work = await Work.findById(req.params.id);

    if (!work) {
      return res.status(404).json({ success: false, message: 'Work not found' });
    }

    // Check authorization: Employer of this job or Admin
    if (work.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (work.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Work already approved' });
    }

    const job = await Job.findById(work.job);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    work.status = 'approved';
    work.paymentStatus = 'paid'; // Mark as paid
    work.rating = rating || 5;
    work.employerFeedback = feedback || '';
    work.paidAt = new Date();
    await work.save();

    // Increment job participants
    job.currentParticipants = (job.currentParticipants || 0) + 1;
    if (job.currentParticipants >= job.workerNeed) {
      job.status = 'completed';
    }
    await job.save();

    // Update worker balances
    const worker = await User.findById(work.worker);
    if (worker) {
      worker.earningBalance += work.paymentAmount;
      worker.totalEarnings += work.paymentAmount;
      worker.completedJobs += 1; // Increment completed jobs
      await worker.save();

      // Create earning transaction
      await Transaction.create({
        user: worker._id,
        type: 'earning', // Make sure this matches enum
        amount: work.paymentAmount,
        status: 'completed',
        description: `Earned from job: ${job.title}`,
        relatedJob: job._id,
        relatedWork: work._id
      });

      // Referral commission (processReferralEarnings)
      await processReferralEarnings(worker._id.toString(), 'task', work.paymentAmount);

      // Notify Worker
      await createNotification(
        worker._id,
        'work_approved',
        'Work Approved',
        `Your work for ${job.title} has been approved! You earned $${work.paymentAmount}`,
        { link: `/my-work`, relatedWork: work._id }
      );
    }

    res.status(200).json({ success: true, data: work });
  } catch (error) {
    console.error('Approve Error:', error);
    res.status(500).json({ success: false, message: error.message });
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

