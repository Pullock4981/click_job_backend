import { uploadSingle, uploadMultiple } from '../utils/cloudinary.js';

// @desc    Upload single file
// @route   POST /api/upload/single
// @access  Private
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        publicId: req.file.filename,
        secureUrl: fileUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'File upload error',
      error: error.message,
    });
  }
};

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const files = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      secureUrl: file.secure_url,
    }));

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        files,
        urls: files.map(f => f.url)
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'File upload error',
      error: error.message,
    });
  }
};

