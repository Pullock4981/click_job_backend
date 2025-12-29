import Ticket from '../models/Ticket.js';
import { createNotification } from '../utils/sendNotification.js';

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private
export const createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;

    const ticket = await Ticket.create({
      user: req.user._id,
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      messages: [
        {
          sender: req.user._id,
          message: description,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get my tickets
// @route   GET /api/tickets/my-tickets
// @access  Private
export const getMyTickets = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Ticket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
export const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.sender', 'name email profilePicture');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Check authorization
    if (
      ticket.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      ticket.assignedTo?._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add message to ticket
// @route   POST /api/tickets/:id/message
// @access  Private
export const addMessage = async (req, res) => {
  try {
    const { message, attachments } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Check authorization
    if (
      ticket.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      ticket.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is closed',
      });
    }

    ticket.messages.push({
      sender: req.user._id,
      message,
      attachments: attachments || [],
    });

    // Update status if admin responds
    if (req.user.role === 'admin' && ticket.status === 'open') {
      ticket.status = 'in-progress';
      if (!ticket.assignedTo) {
        ticket.assignedTo = req.user._id;
      }
    }

    await ticket.save();

    // Notify other party
    const notifyUserId =
      ticket.user.toString() === req.user._id.toString()
        ? ticket.assignedTo || null
        : ticket.user;

    if (notifyUserId) {
      await createNotification(
        notifyUserId,
        'message',
        'New Ticket Message',
        `New message in ticket: ${ticket.subject}`,
        { link: `/tickets/${ticket._id}` }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: { ticket },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update ticket status
// @route   PUT /api/tickets/:id/status
// @access  Private (Admin)
export const updateTicketStatus = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    if (status) ticket.status = status;
    if (assignedTo) ticket.assignedTo = assignedTo;

    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = req.user._id;
    }

    await ticket.save();

    // Notify user
    await createNotification(
      ticket.user,
      'system',
      'Ticket Status Updated',
      `Your ticket "${ticket.subject}" status has been updated to ${status}`,
      { link: `/tickets/${ticket._id}` }
    );

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: { ticket },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all tickets (admin)
// @route   GET /api/tickets/all
// @access  Private (Admin)
export const getAllTickets = async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const tickets = await Ticket.find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Ticket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

