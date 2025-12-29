import express from 'express';
import {
  createJob,
  getJobs,
  getJob,
  getMyJobs,
  updateJob,
  deleteJob,
  applyJob,
  getJobApplicants,
  assignJob,
} from '../controllers/jobController.js';
import {
  reportJob,
  getJobReports,
  updateReportStatus,
} from '../controllers/jobReportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getJobs);
router.get('/my-jobs', protect, getMyJobs); // All logged in users can see their jobs
router.get('/:id', getJob);
// Regular users and employers can create jobs
router.post('/', protect, createJob);
// Only employer (job owner) or admin can update/delete
router.put('/:id', protect, updateJob);
router.delete('/:id', protect, deleteJob);
router.post('/:id/apply', protect, applyJob);
router.get('/:id/applicants', protect, getJobApplicants); // Job owner or admin
router.post('/:id/assign/:userId', protect, assignJob); // Job owner or admin
router.post('/:id/report', protect, reportJob);
router.get('/:id/reports', protect, authorize('admin'), getJobReports);
router.put('/:id/reports/:reportId', protect, authorize('admin'), updateReportStatus);

export default router;

