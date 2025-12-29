import express from 'express';
import {
  getMySubscription,
  getPlans,
  subscribe,
  cancelSubscription,
} from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/plans', getPlans);
router.get('/my-plan', protect, getMySubscription);
router.post('/subscribe', protect, subscribe);
router.put('/cancel', protect, cancelSubscription);

export default router;

