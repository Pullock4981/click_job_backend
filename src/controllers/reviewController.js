import Review from '../models/Review.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { reviewed, job, work, rating, comment, type } = req.body;

    // Validate
    if (!reviewed || !rating || !type) {
      return res.status(400).json({
        success: false,
        message: 'Reviewed user, rating, and type are required',
      });
    }

    // Check if review already exists for this job/work
    const existingReview = await Review.findOne({
      reviewer: req.user._id,
      reviewed,
      ...(job && { job }),
      ...(work && { work }),
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists',
      });
    }

    // Validate type
    if (type === 'worker_to_employer') {
      // Worker reviewing employer
      if (work) {
        const workDoc = await Work.findById(work);
        if (
          workDoc.worker.toString() !== req.user._id.toString() ||
          workDoc.employer.toString() !== reviewed
        ) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized',
          });
        }
      }
    } else if (type === 'employer_to_worker') {
      // Employer reviewing worker
      if (work) {
        const workDoc = await Work.findById(work);
        if (
          workDoc.employer.toString() !== req.user._id.toString() ||
          workDoc.worker.toString() !== reviewed
        ) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized',
          });
        }
      }
    }

    // Create review
    const review = await Review.create({
      reviewer: req.user._id,
      reviewed,
      job: job || null,
      work: work || null,
      rating,
      comment: comment || '',
      type,
    });

    // Update user rating
    await updateUserRating(reviewed);

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name profilePicture')
      .populate('reviewed', 'name profilePicture');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review: populatedReview },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Public
export const getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    const query = { reviewed: req.params.userId };
    if (type) query.type = type;

    const reviews = await Review.find(query)
      .populate('reviewer', 'name profilePicture')
      .populate('job', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    // Calculate average rating
    const avgRating = await Review.aggregate([
      { $match: query },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);
    const averageRating = avgRating[0]?.avgRating || 0;

    res.status(200).json({
      success: true,
      data: {
        reviews,
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalReviews: total,
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

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    // Update user rating
    await updateUserRating(review.reviewed);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (
      review.reviewer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const reviewedUserId = review.reviewed;
    await review.deleteOne();

    // Update user rating
    await updateUserRating(reviewedUserId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// Helper function to update user rating
const updateUserRating = async (userId) => {
  try {
    const reviews = await Review.find({ reviewed: userId });
    if (reviews.length === 0) return;

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await User.findByIdAndUpdate(userId, {
      rating: parseFloat(avgRating.toFixed(2)),
    });
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
};

