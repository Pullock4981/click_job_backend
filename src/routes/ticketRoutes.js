import express from 'express';
import {
  createTicket,
  getMyTickets,
  getTicket,
  addMessage,
  updateTicketStatus,
  getAllTickets,
} from '../controllers/ticketController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createTicket);
router.get('/my-tickets', protect, getMyTickets);
router.get('/all', protect, authorize('admin'), getAllTickets);
router.get('/:id', protect, getTicket);
router.post('/:id/message', protect, addMessage);
router.put('/:id/status', protect, authorize('admin'), updateTicketStatus);

export default router;

