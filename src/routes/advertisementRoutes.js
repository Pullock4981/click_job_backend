import express from 'express';
import {
  getAdvertisements,
  getAllAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  trackClick,
  getMyAdvertisements,
  getAdsRates,
  createAdsRate,
  deleteAdsRate,
  getClickEarnAds,
  createClickEarnAd,
  deleteClickEarnAd,
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

// Ads Rate
router.get('/rates', getAdsRates);
router.post('/rates', protect, authorize('admin'), createAdsRate);
router.delete('/rates/:id', protect, authorize('admin'), deleteAdsRate);

// Click & Earn Ads
router.get('/click-earn', getClickEarnAds);
router.post('/click-earn', protect, createClickEarnAd);
router.delete('/click-earn/:id', protect, authorize('admin'), deleteClickEarnAd);

export default router;

