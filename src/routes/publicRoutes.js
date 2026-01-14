import express from 'express';
import { getPublicWebsiteInfo } from '../controllers/publicController.js';

const router = express.Router();

router.get('/info', getPublicWebsiteInfo);

export default router;
