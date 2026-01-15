import express from 'express';
import { getWallet, deposit, withdraw, convertEarningsToDeposit } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWallet);
router.post('/deposit', protect, deposit);
router.post('/withdraw', protect, withdraw);
router.post('/convert', protect, convertEarningsToDeposit);

export default router;

