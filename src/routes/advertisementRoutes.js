import express from 'express';
import {
  getAdvertisements,
  getAllAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  trackClick,
  getMyAdvertisements,
} from '../controllers/advertisementController.js';

import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAdvertisements);
router.get('/my', protect, getMyAdvertisements);
router.get('/all', protect, authorize('admin'), getAllAdvertisements);
router.post('/', protect, createAdvertisement);
router.put('/:id', protect, authorize('admin'), updateAdvertisement);
router.delete('/:id', protect, authorize('admin'), deleteAdvertisement);
router.post('/:id/click', trackClick);


export default router;

