import express from 'express';
import {
  getMyReferralCode,
  getMyReferrals,
  getReferralEarnings,
  applyReferralCode,
} from '../controllers/referralController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-code', protect, getMyReferralCode);
router.get('/my-referrals', protect, getMyReferrals);
router.get('/earnings', protect, getReferralEarnings);
router.post('/apply-code', applyReferralCode);

export default router;

