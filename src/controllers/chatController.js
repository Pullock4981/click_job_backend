import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import { getIO } from '../socket/socketServer.js';
import { createNotification } from '../utils/sendNotification.js';

// @desc    Get my chats
// @route   GET /api/chat
// @access  Private
export const getMyChats = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const query = {
      participants: req.user._id,
      isActive: true,
    };

    if (type) query.type = type;

    const chats = await Chat.find(query)
      .populate('participants', 'name email profilePicture')
      .populate('lastMessageBy', 'name profilePicture')
      .populate('relatedJob', 'title budget')
      .populate('relatedWork')
      .sort({ lastMessageAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Format unread count for each chat
    const formattedChats = chats.map((chat) => ({
      ...chat.toObject(),
      unreadCount: chat.unreadCount.get(req.user._id.toString()) || 0,
    }));

    const total = await Chat.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        chats: formattedChats,
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

// @desc    Get single chat
// @route   GET /api/chat/:id
// @access  Private
export const getChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'name email profilePicture')
      .populate('messages.sender', 'name email profilePicture')
      .populate('relatedJob', 'title description budget category')
      .populate('relatedWork')
      .populate('createdBy', 'name email profilePicture');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Check if user is participant
    const isParticipant = chat.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Mark as read
    chat.messages.forEach((msg) => {
      const alreadyRead = msg.readBy.some(
        (read) => read.user.toString() === req.user._id.toString()
      );
      if (!alreadyRead && msg.sender._id.toString() !== req.user._id.toString()) {
        msg.readBy.push({
          user: req.user._id,
          readAt: new Date(),
        });
      }
    });

    chat.unreadCount.set(req.user._id.toString(), 0);
    await chat.save();

    res.status(200).json({
      success: true,
      data: {
        chat: {
          ...chat.toObject(),
          unreadCount: 0,
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

// @desc    Create chat
// @route   POST /api/chat
// @access  Private
export const createChat = async (req, res) => {
  try {
    const { participants, type, relatedJob, relatedWork } = req.body;

    // Support chat - always with admin
    if (type === 'support') {
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        return res.status(400).json({
          success: false,
          message: 'No admin found',
        });
      }

      // Check if support chat already exists
      const existingChat = await Chat.findOne({
        type: 'support',
        participants: { $all: [req.user._id, admin._id] },
        isActive: true,
      });

      if (existingChat) {
        return res.status(200).json({
          success: true,
          message: 'Support chat already exists',
          data: { chat: existingChat },
        });
      }

      const chat = await Chat.create({
        participants: [req.user._id, admin._id],
        type: 'support',
        createdBy: req.user._id,
      });

      const populatedChat = await Chat.findById(chat._id)
        .populate('participants', 'name email profilePicture');

      return res.status(201).json({
        success: true,
        message: 'Support chat created',
        data: { chat: populatedChat },
      });
    }

    // Job or Work related chat
    if (relatedJob || relatedWork) {
      let job, work;
      
      if (relatedJob) {
        job = await Job.findById(relatedJob);
        if (!job) {
          return res.status(404).json({
            success: false,
            message: 'Job not found',
          });
        }

        // Check authorization
        if (
          job.employer.toString() !== req.user._id.toString() &&
          job.assignedTo?.toString() !== req.user._id.toString() &&
          req.user.role !== 'admin'
        ) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized',
          });
        }

        // Auto-set participants
        const chatParticipants = [job.employer];
        if (job.assignedTo) {
          chatParticipants.push(job.assignedTo);
        }

        // Check if chat already exists
        const existingChat = await Chat.findOne({
          type: 'job',
          relatedJob: job._id,
          isActive: true,
        });

        if (existingChat) {
          return res.status(200).json({
            success: true,
            message: 'Job chat already exists',
            data: { chat: existingChat },
          });
        }

        const chat = await Chat.create({
          participants: chatParticipants,
          type: 'job',
          relatedJob: job._id,
          createdBy: req.user._id,
        });

        const populatedChat = await Chat.findById(chat._id)
          .populate('participants', 'name email profilePicture')
          .populate('relatedJob', 'title budget');

        return res.status(201).json({
          success: true,
          message: 'Job chat created',
          data: { chat: populatedChat },
        });
      }

      if (relatedWork) {
        work = await Work.findById(relatedWork).populate('job');
        if (!work) {
          return res.status(404).json({
            success: false,
            message: 'Work not found',
          });
        }

        // Check authorization
        if (
          work.employer.toString() !== req.user._id.toString() &&
          work.worker.toString() !== req.user._id.toString() &&
          req.user.role !== 'admin'
        ) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized',
          });
        }

        // Check if chat already exists
        const existingChat = await Chat.findOne({
          type: 'work',
          relatedWork: work._id,
          isActive: true,
        });

        if (existingChat) {
          return res.status(200).json({
            success: true,
            message: 'Work chat already exists',
            data: { chat: existingChat },
          });
        }

        const chat = await Chat.create({
          participants: [work.employer, work.worker],
          type: 'work',
          relatedWork: work._id,
          relatedJob: work.job._id,
          createdBy: req.user._id,
        });

        const populatedChat = await Chat.findById(chat._id)
          .populate('participants', 'name email profilePicture')
          .populate('relatedWork')
          .populate('relatedJob', 'title budget');

        return res.status(201).json({
          success: true,
          message: 'Work chat created',
          data: { chat: populatedChat },
        });
      }
    }

    // Direct chat
    if (!participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Participants are required for direct chat',
      });
    }

    // Add current user to participants
    const allParticipants = [...new Set([req.user._id, ...participants])];

    if (allParticipants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 participants required',
      });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      type: 'direct',
      participants: { $all: allParticipants, $size: allParticipants.length },
      isActive: true,
    });

    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: 'Chat already exists',
        data: { chat: existingChat },
      });
    }

    const chat = await Chat.create({
      participants: allParticipants,
      type: 'direct',
      createdBy: req.user._id,
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name email profilePicture');

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: { chat: populatedChat },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Send message (REST API fallback)
// @route   POST /api/chat/:id/message
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { message, attachments } = req.body;

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const newMessage = {
      sender: req.user._id,
      message,
      attachments: attachments || [],
      readBy: [
        {
          user: req.user._id,
          readAt: new Date(),
        },
      ],
    };

    chat.messages.push(newMessage);
    chat.lastMessage = message;
    chat.lastMessageAt = new Date();
    chat.lastMessageBy = req.user._id;

    // Update unread count
    chat.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user._id.toString()) {
        const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
        chat.unreadCount.set(participantId.toString(), currentCount + 1);
      } else {
        chat.unreadCount.set(participantId.toString(), 0);
      }
    });

    await chat.save();

    // Emit via Socket.io if available
    const io = getIO();
    const populatedChat = await Chat.findById(chat._id)
      .populate('messages.sender', 'name email profilePicture');

    const messageData = populatedChat.messages[populatedChat.messages.length - 1];

    io.to(`chat_${chat._id}`).emit('new_message', {
      chatId: chat._id,
      message: messageData,
      chat: {
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: Object.fromEntries(chat.unreadCount),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: messageData },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Mark chat as read
// @route   PUT /api/chat/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Mark all messages as read
    chat.messages.forEach((msg) => {
      const alreadyRead = msg.readBy.some(
        (read) => read.user.toString() === req.user._id.toString()
      );
      if (!alreadyRead && msg.sender.toString() !== req.user._id.toString()) {
        msg.readBy.push({
          user: req.user._id,
          readAt: new Date(),
        });
      }
    });

    chat.unreadCount.set(req.user._id.toString(), 0);
    await chat.save();

    // Emit via Socket.io
    const io = getIO();
    io.to(`chat_${chat._id}`).emit('messages_read', {
      chatId: chat._id,
      userId: req.user._id,
      unreadCount: Object.fromEntries(chat.unreadCount),
    });

    res.status(200).json({
      success: true,
      message: 'Chat marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get unread chat count
// @route   GET /api/chat/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      isActive: true,
    });

    let totalUnread = 0;
    chats.forEach((chat) => {
      totalUnread += chat.unreadCount.get(req.user._id.toString()) || 0;
    });

    res.status(200).json({
      success: true,
      data: { unreadCount: totalUnread },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete chat
// @route   DELETE /api/chat/:id
// @access  Private
export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    if (!chat.participants.includes(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    chat.isActive = false;
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

