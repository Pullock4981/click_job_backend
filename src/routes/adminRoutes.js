import express from 'express';
import {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  issueUserWarning,
  getAllJobs,
  updateJobAdmin,
  deleteJobAdmin,
  getSystemStats,
  getAdmins,
  createAdmin,
  updateAdminAccount,
  deleteAdminAccount,
} from '../controllers/adminController.js';
import {
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from '../controllers/withdrawalController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require admin role
router.use(protect, authorize('admin'));

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/warning', issueUserWarning);

// Job management
router.get('/jobs', getAllJobs);
router.put('/jobs/:id', updateJobAdmin);
router.delete('/jobs/:id', deleteJobAdmin);

// Withdrawal management
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:id/approve', approveWithdrawal);
router.put('/withdrawals/:id/reject', rejectWithdrawal);

// System stats
router.get('/stats', getSystemStats);

// Admin Management
router.get('/accounts', getAdmins);
router.post('/accounts', createAdmin);
router.put('/accounts/:id', updateAdminAccount);
router.delete('/accounts/:id', deleteAdminAccount);

export default router;


