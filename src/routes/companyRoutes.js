import express from 'express';
import { getCompanyContent, updateCompanyContent } from '../controllers/companyController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:type', getCompanyContent);
router.put('/:type', protect, authorize('admin', 'superadmin'), updateCompanyContent);

export default router;
