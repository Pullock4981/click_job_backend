import express from 'express';
import {
  getTopDepositors,
  getTopWorkers,
  getTopJobPosters,
  getTopReferrers,
  getTopUsers,
  getMyRank,
} from '../controllers/leaderboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/top-depositors', getTopDepositors);
router.get('/top-workers', getTopWorkers);
router.get('/top-job-posters', getTopJobPosters);
router.get('/top-referrers', getTopReferrers);
router.get('/top-users', getTopUsers);
router.get('/my-rank', protect, getMyRank);

export default router;

