import express from 'express';
import {
  getMyProfile,
  updateProfile,
  getPublicProfile,
  changePassword,
} from '../controllers/userController.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { trackLogin } from '../middleware/trackLogin.js';

const router = express.Router();

router.get('/dashboard', protect, trackLogin, getDashboard);
router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.get('/:id/public', getPublicProfile);

export default router;

