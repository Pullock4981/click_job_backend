import Job from '../models/Job.js';
import Work from '../models/Work.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../utils/sendNotification.js';
import { createActivity } from './activityController.js';
import { broadcastAdminStats } from '../utils/broadcastStats.js';

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private (Employer)
export const createJob = async (req, res) => {
  try {
    const {
      title,
      category,
      subCategory,
      selectedZone,
      hiddenCountries,
      tasks,
      proof,
      workerNeed,
      workerEarn,
      requiredScreenshots,
      estimatedDays,
      boostPeriod,
      scheduleTime,
    } = req.body;

    const totalBudget = workerNeed * workerEarn;
    const minSpend = 0.80;

    if (totalBudget < minSpend) {
      return res.status(400).json({
        success: false,
        message: `Minimum spend is $${minSpend.toFixed(2)}`,
      });
    }

    const user = await User.findById(req.user._id);
    if (user.depositBalance < totalBudget) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient deposit balance to post this job',
      });
    }

    const job = await Job.create({
      title,
      description: title, // use title as description if not provided separately
      category,
      subCategory,
      selectedZone,
      hiddenCountries,
      taskInstructions: tasks,
      requiredProof: proof,
      workerNeed,
      workerEarn,
      budget: totalBudget,
      maxParticipants: workerNeed,
      requiredScreenshots,
      estimatedDays,
      boostPeriod,
      scheduleTime,
      employer: req.user._id,
      adminStatus: 'pending',
      status: 'pending-approval',
    });

    // Deduct balance
    user.depositBalance -= totalBudget;
    await user.save();

    // Create Transaction
    await Transaction.create({
      user: req.user._id,
      type: 'payment',
      amount: totalBudget,
      status: 'completed',
      description: `Job posting: ${title}`,
      relatedJob: job._id,
    });

    // Create activity
    await createActivity(req.user._id, 'job_posted', {
      job: job._id,
      message: `Posted job: ${job.title}`,
      isPublic: true,
    });

    // Broadcast stats to admin
    broadcastAdminStats();

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
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

// @desc    Get all jobs (with filters)
// @route   GET /api/jobs
// @access  Public
export const getJobs = async (req, res) => {
  try {
    const {
      category,
      status,
      minBudget,
      maxBudget,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = Number(minBudget);
      if (maxBudget) query.budget.$lte = Number(maxBudget);
    }
    if (search) {
      query.$text = { $search: search };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const jobs = await Job.find(query)
      .populate('employer', 'name email profilePicture rating')
      .populate('assignedTo', 'name email profilePicture')
      .sort(sort)
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

// @desc    Get single job with user-specific info
// @route   GET /api/jobs/:id
// @access  Public
export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employer', 'name email profilePicture rating completedJobs createdAt')
      .populate('assignedTo', 'name email profilePicture')
      .populate('applicants.user', 'name email profilePicture rating');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Get additional stats
    const completedCount = await Work.countDocuments({
      job: job._id,
      status: 'approved',
    });

    const participantCount = job.applicants.length;
    const isFull = job.maxParticipants ? participantCount >= job.maxParticipants : false;

    // User-specific info (if logged in)
    let userInfo = null;
    if (req.user) {
      // Check if user applied
      const hasApplied = job.applicants.some(
        (app) => app.user._id.toString() === req.user._id.toString()
      );

      // Check if user has work assigned
      const userWork = await Work.findOne({
        job: job._id,
        worker: req.user._id,
      });

      // Get user's progress if work exists
      let progress = null;
      if (userWork) {
        progress = {
          workId: userWork._id,
          status: userWork.status,
          submissionProof: userWork.submissionProof,
          submissionFiles: userWork.submissionFiles,
          submissionDate: userWork.submissionDate,
          paymentStatus: userWork.paymentStatus,
          paymentAmount: userWork.paymentAmount,
        };
      }

      userInfo = {
        hasApplied,
        canApply: !hasApplied && job.status === 'open' && !isFull,
        isAssigned: job.assignedTo?.toString() === req.user._id.toString(),
        isEmployer: job.employer._id.toString() === req.user._id.toString(),
        work: progress,
      };
    }

    // Format job data
    const jobData = {
      ...job.toObject(),
      stats: {
        participantCount,
        completedCount,
        maxParticipants: job.maxParticipants,
        isFull,
        availableSlots: job.maxParticipants
          ? Math.max(0, job.maxParticipants - participantCount)
          : null,
      },
      userInfo,
    };

    res.status(200).json({
      success: true,
      data: { job: jobData },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get my posted jobs
// @route   GET /api/jobs/my-jobs
// @access  Private (All users can see their posted jobs)
export const getMyJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { employer: req.user._id };
    if (status) query.status = status;

    const jobs = await Job.find(query)
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

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Job Owner or Admin)
export const updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Allow update if user is job owner or admin
    if (
      job.employer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job',
      });
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

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

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const remainingWorkers = (job.workerNeed || 0) - (job.currentParticipants || 0);
    const refundAmount = remainingWorkers * (job.workerEarn || 0);

    if (refundAmount > 0) {
      const employer = await User.findById(job.employer);
      if (employer) {
        employer.depositBalance += refundAmount;
        await employer.save();

        await Transaction.create({
          user: employer._id,
          type: 'deposit',
          amount: refundAmount,
          status: 'completed',
          description: `Refund for deleted job: ${job.title}`,
          relatedJob: job._id
        });
      }
    }

    await job.deleteOne();

    res.status(200).json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Apply for job
// @route   POST /api/jobs/:id/apply
// @access  Private (User)
export const applyJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Job is not open for applications',
      });
    }

    // Check if already applied
    const alreadyApplied = job.applicants.some(
      (app) => app.user.toString() === req.user._id.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }

    job.applicants.push({
      user: req.user._id,
      message: req.body.message || '',
    });

    await job.save();

    // Create activity
    await createActivity(req.user._id, 'job_applied', {
      job: job._id,
      message: `Applied for job: ${job.title}`,
      isPublic: true,
    });

    // Notify employer
    await createNotification(
      job.employer,
      'system',
      'New Job Application',
      `${req.user.name} applied for your job: ${job.title}`,
      { link: `/jobs/${job._id}`, relatedJob: job._id }
    );

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
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

// @desc    Get job applicants
// @route   GET /api/jobs/:id/applicants
// @access  Private (Job Owner or Admin)
export const getJobApplicants = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      'applicants.user',
      'name email profilePicture rating completedJobs'
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Allow if user is job owner or admin
    if (
      job.employer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      data: { applicants: job.applicants },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Assign job to user
// @route   POST /api/jobs/:id/assign/:userId
// @access  Private (Job Owner or Admin)
export const assignJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Allow if user is job owner or admin
    if (
      job.employer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (job.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Job is not open for assignment',
      });
    }

    const worker = await User.findById(req.params.userId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Create work entry
    const work = await Work.create({
      job: job._id,
      worker: worker._id,
      employer: req.user._id,
      status: 'pending',
      paymentAmount: job.budget,
    });

    // Update job
    job.assignedTo = worker._id;
    job.status = 'in-progress';
    job.assignedAt = new Date();
    await job.save();

    // Update user stats
    await User.findByIdAndUpdate(worker._id, {
      $inc: { activeJobs: 1 },
    });

    // Auto-create chat for job communication
    try {
      const existingChat = await Chat.findOne({
        type: 'work',
        relatedWork: work._id,
        isActive: true,
      });

      if (!existingChat) {
        await Chat.create({
          participants: [req.user._id, worker._id],
          type: 'work',
          relatedJob: job._id,
          relatedWork: work._id,
          createdBy: req.user._id,
        });
      }
    } catch (chatError) {
      console.error('Error creating chat:', chatError);
      // Don't fail the job assignment if chat creation fails
    }

    // Create activity
    await createActivity(worker._id, 'job_assigned', {
      job: job._id,
      work: work._id,
      message: `Assigned to: ${job.title}`,
      isPublic: true,
    });

    // Notify worker
    await createNotification(
      worker._id,
      'job_assigned',
      'Job Assigned',
      `You have been assigned to job: ${job.title}`,
      { link: `/works/${work._id}`, relatedJob: job._id, relatedWork: work._id }
    );

    res.status(200).json({
      success: true,
      message: 'Job assigned successfully',
      data: { job, work },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

