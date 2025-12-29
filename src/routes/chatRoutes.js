import express from 'express';
import {
  getMyChats,
  getChat,
  createChat,
  sendMessage,
  markAsRead,
  getUnreadCount,
  deleteChat,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getMyChats);
router.get('/unread-count', protect, getUnreadCount);
router.get('/:id', protect, getChat);
router.post('/', protect, createChat);
router.post('/:id/message', protect, sendMessage);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteChat);

export default router;

