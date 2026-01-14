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
  getHeaderNotice,
  updateHeaderNotice,
  getVerificationRequests,
  getCounterInfo,
  updateCounterInfo,
  getContactInfo,
  updateContactInfo,
  getContactMessages,
  deleteContactMessage,
  getGoogleAds,
  createGoogleAd,
  updateGoogleAd,
  deleteGoogleAd,
  getServices,
  createService,
  deleteService,
  getPremiumPackages,
  createPremiumPackage,
  updatePremiumPackage,
  deletePremiumPackage,
  getPremiumUsers,
  getApprovalJobs,
  approveJob,
  rejectJob,
  getDeleteRequestJobs,
  getJobWorks,
  getDepositMethods,
  createDepositMethod,
  deleteDepositMethod,
  getDepositRequests,
  getWithdrawMethods,
  createWithdrawMethod,
  deleteWithdrawMethod,
  getWithdrawRequests,
  updateTransactionStatus,
  getSMMCategoroies,
  createSMMCategory,
  deleteSMMCategory,
  getSMMServices,
  createSMMService,
  deleteSMMService,
  getSMMRequests,
  updateSMMRequestStatus,
  getHeadlines,
  createHeadline,
  deleteHeadline,
  getTopWorkers,
  getTopJobPosters,
  getTopDepositors,
  getTopBestUsers,
  getTopReferrers,
  getReferralSettings,
  createReferralSetting,
  deleteReferralSetting,
  getJobCategories,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getJobSubCategories,
  createJobSubCategory,
  updateJobSubCategory,
  deleteJobSubCategory,
  getCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  getLocationZones,
  createLocationZone,
  updateLocationZone,
  deleteLocationZone,
  getAppSettings,
  updateAppSettings,
  getSpinSettings,
  updateSpinSettings,
  getCustomScripts,
  createCustomScript,
  deleteCustomScript,
  getAdminMessages,
  sendAdminMessage,
  deleteAdminMessage,
  getWebsiteInfo,
  updateWebsiteInfo,
  getDuplicateUsers,
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
router.get('/users/duplicate', getDuplicateUsers);
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

// Header Info & Notice
router.get('/header-notice', getHeaderNotice);
router.put('/header-notice', updateHeaderNotice);

// Verification Requests
router.get('/verification-requests', getVerificationRequests);

// Counter Info
router.get('/counter-info', getCounterInfo);
router.put('/counter-info', updateCounterInfo);

// Contact Info
router.get('/contact-info', getContactInfo);
router.put('/contact-info', updateContactInfo);

// Contact Messages
router.get('/contact-messages', getContactMessages);
router.delete('/contact-messages/:id', deleteContactMessage);

// Google Ads
router.get('/google-ads', getGoogleAds);
router.post('/google-ads', createGoogleAd);
router.put('/google-ads/:id', updateGoogleAd);
router.delete('/google-ads/:id', deleteGoogleAd);

// Services
router.get('/services', getServices);
router.post('/services', createService);
router.delete('/services/:id', deleteService);

// Premium Packages
router.get('/packages', getPremiumPackages);
router.post('/packages', createPremiumPackage);
router.put('/packages/:id', updatePremiumPackage);
router.delete('/packages/:id', deletePremiumPackage);

// Premium Users
router.get('/premium-users', getPremiumUsers);

// Job Management
router.get('/jobs/approval', getApprovalJobs);
router.put('/jobs/approve/:id', approveJob);
router.put('/jobs/reject/:id', rejectJob);
router.get('/jobs/delete-requests', getDeleteRequestJobs);
router.get('/jobs/works', getJobWorks);

// Deposit Manage
router.get('/deposit/methods', getDepositMethods);
router.post('/deposit/methods', createDepositMethod);
router.delete('/deposit/methods/:id', deleteDepositMethod);
router.get('/deposit/list', getDepositRequests);

// Withdraw Manage
router.get('/withdraw/methods', getWithdrawMethods);
router.post('/withdraw/methods', createWithdrawMethod);
router.delete('/withdraw/methods/:id', deleteWithdrawMethod);
router.get('/withdraw/list', getWithdrawRequests);

// Transaction Update
router.put('/transactions/:id/status', updateTransactionStatus);

// SMM Manage
router.get('/smm/categories', getSMMCategoroies);
router.post('/smm/categories', createSMMCategory);
router.delete('/smm/categories/:id', deleteSMMCategory);

router.get('/smm/services', getSMMServices);
router.post('/smm/services', createSMMService);
router.delete('/smm/services/:id', deleteSMMService);

router.get('/smm/requests', getSMMRequests);
router.put('/smm/requests/:id/status', updateSMMRequestStatus);

// Headline & Top User
router.get('/headlines', getHeadlines);
router.post('/headlines', createHeadline);
router.delete('/headlines/:id', deleteHeadline);

router.get('/reports/top-workers', getTopWorkers);
router.get('/reports/top-job-posters', getTopJobPosters);
router.get('/reports/top-depositors', getTopDepositors);
router.get('/reports/top-best-users', getTopBestUsers);
router.get('/reports/top-referrers', getTopReferrers);

// System Settings
router.get('/referral-settings', getReferralSettings);
router.post('/referral-settings', createReferralSetting);
router.delete('/referral-settings/:id', deleteReferralSetting);

router.get('/job-categories', getJobCategories);
router.post('/job-categories', createJobCategory);
router.put('/job-categories/:id', updateJobCategory);
router.delete('/job-categories/:id', deleteJobCategory);

router.get('/job-sub-categories', getJobSubCategories);
router.post('/job-sub-categories', createJobSubCategory);
router.put('/job-sub-categories/:id', updateJobSubCategory);
router.delete('/job-sub-categories/:id', deleteJobSubCategory);

router.get('/countries', getCountries);
router.post('/countries', createCountry);
router.put('/countries/:id', updateCountry);
router.delete('/countries/:id', deleteCountry);

router.get('/location-zones', getLocationZones);
router.post('/location-zones', createLocationZone);
router.put('/location-zones/:id', updateLocationZone);
router.delete('/location-zones/:id', deleteLocationZone);

// Additional System Settings
router.get('/app-settings', getAppSettings);
router.put('/app-settings', updateAppSettings);

router.get('/spin-settings', getSpinSettings);
router.put('/spin-settings', updateSpinSettings);

router.get('/custom-scripts', getCustomScripts);
router.post('/custom-scripts', createCustomScript);
router.delete('/custom-scripts/:id', deleteCustomScript);

router.get('/admin-messages', getAdminMessages);
router.post('/admin-messages', sendAdminMessage);
router.delete('/admin-messages/:id', deleteAdminMessage);

router.get('/website-info', getWebsiteInfo);
router.put('/website-info', updateWebsiteInfo);

export default router;


