import express from 'express';
import { getLotteries, createLottery, updateLottery, deleteLottery } from '../controllers/lotteryController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getLotteries);
router.post('/', protect, authorize('admin'), createLottery);
router.put('/:id', protect, authorize('admin'), updateLottery);
router.delete('/:id', protect, authorize('admin'), deleteLottery);

export default router;
