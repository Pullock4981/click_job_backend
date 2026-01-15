import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Local Storage Configuration
const uploadDir = 'uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Multer upload middleware
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(
      file.originalname.toLowerCase().split('.').pop()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  },
});

// Upload single file
export const uploadSingle = (fieldName) => upload.single(fieldName);

// Upload multiple files
export const uploadMultiple = (fieldName, maxCount = 5) =>
  upload.array(fieldName, maxCount);

// Mock Cloudinary Delete (No-op or FS unlink)
export const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { result: 'ok' };
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw, just log
  }
};

// Mock Cloudinary Upload (No-op as we already have the file)
export const uploadFile = async (filePath) => {
  // Already on disk
  return { secure_url: filePath, public_id: filePath };
};

export default { upload, uploadSingle, uploadMultiple, deleteFile, uploadFile };

