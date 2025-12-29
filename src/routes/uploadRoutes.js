import express from 'express';
import {
  uploadSingleFile,
  uploadMultipleFiles,
} from '../controllers/uploadController.js';
import { uploadSingle, uploadMultiple } from '../utils/cloudinary.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/single', protect, uploadSingle('file'), uploadSingleFile);
router.post('/multiple', protect, uploadMultiple('files', 10), uploadMultipleFiles);

export default router;

