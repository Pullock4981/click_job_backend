import Advertisement from '../models/Advertisement.js';

// @desc    Get active advertisements
// @route   GET /api/advertisements
// @access  Public
export const getAdvertisements = async (req, res) => {
  try {
    const { position } = req.query;

    const query = {
      status: 'active',
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: new Date() } },
      ],
      startDate: { $lte: new Date() },
    };

    if (position) query.position = position;

    const advertisements = await Advertisement.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: { advertisements },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all advertisements (admin)
// @route   GET /api/advertisements/all
// @access  Private (Admin)
export const getAllAdvertisements = async (req, res) => {
  try {
    const { status, position, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (position) query.position = position;

    const advertisements = await Advertisement.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Advertisement.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        advertisements,
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

// @desc    Create advertisement
// @route   POST /api/advertisements
// @access  Private (Admin)
export const createAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      data: { advertisement },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update advertisement
// @route   PUT /api/advertisements/:id
// @access  Private (Admin)
export const updateAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      data: { advertisement },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete advertisement
// @route   DELETE /api/advertisements/:id
// @access  Private (Admin)
export const deleteAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
      });
    }

    await advertisement.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Track advertisement click
// @route   POST /api/advertisements/:id/click
// @access  Public
export const trackClick = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
      });
    }

    advertisement.clicks += 1;
    await advertisement.save();

    res.status(200).json({
      success: true,
      message: 'Click tracked',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user's own advertisements
// @route   GET /api/advertisements/my
// @access  Private
export const getMyAdvertisements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = { createdBy: req.user._id };

    const advertisements = await Advertisement.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Advertisement.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        advertisements,
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
