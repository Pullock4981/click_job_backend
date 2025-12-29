import express from 'express';
import { getTransactions, getTransaction } from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getTransactions);
router.get('/:id', protect, getTransaction);

export default router;

