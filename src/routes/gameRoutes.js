import express from 'express';
import {
  getAvailableGames,
  playGame,
  getMyScores,
  getLeaderboard,
} from '../controllers/gameController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/available', getAvailableGames);
router.post('/play', protect, playGame);
router.get('/my-scores', protect, getMyScores);
router.get('/leaderboard', getLeaderboard);

export default router;

