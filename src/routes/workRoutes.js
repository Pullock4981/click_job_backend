import express from 'express';
import {
  getMyWorks,
  getWork,
  submitWork,
  approveWork,
  rejectWork,
  createWorkSubmission,
  getEmployerWorks
} from '../controllers/workController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-work', protect, getMyWorks);
router.get('/employer', protect, getEmployerWorks);
router.post('/:jobId', protect, createWorkSubmission);
router.get('/:id', protect, getWork);
router.put('/:id/submit', protect, submitWork);
router.put('/:id/approve', protect, authorize('employer', 'admin'), approveWork);
router.put('/:id/reject', protect, authorize('employer', 'admin'), rejectWork);

export default router;

