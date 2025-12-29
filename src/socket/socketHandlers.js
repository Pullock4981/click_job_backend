import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { createNotification } from '../utils/sendNotification.js';

// Store online users
const onlineUsers = new Map();

export const handleConnection = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Add user to online users
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date(),
    });

    // Join user's personal room
    socket.join(`user_${socket.userId}`);

    // Emit online status to user's contacts
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      status: 'online',
    });

    // Send user's online contacts
    socket.emit('online_users', Array.from(onlineUsers.keys()));

    // Handle join chat room
    socket.on('join_chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.includes(socket.userId)) {
          socket.join(`chat_${chatId}`);
          socket.emit('joined_chat', { chatId });
          
          // Mark messages as read
          await markChatAsRead(chatId, socket.userId);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle leave chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
    });

    // Handle send message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, message, attachments } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        if (!chat.participants.includes(socket.userId)) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Create message
        const newMessage = {
          sender: socket.userId,
          message,
          attachments: attachments || [],
          readBy: [
            {
              user: socket.userId,
              readAt: new Date(),
            },
          ],
        };

        chat.messages.push(newMessage);
        chat.lastMessage = message;
        chat.lastMessageAt = new Date();
        chat.lastMessageBy = socket.userId;

        // Update unread count for other participants
        chat.participants.forEach((participantId) => {
          if (participantId.toString() !== socket.userId) {
            const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
            chat.unreadCount.set(participantId.toString(), currentCount + 1);
          } else {
            chat.unreadCount.set(participantId.toString(), 0);
          }
        });

        await chat.save();

        // Populate sender info
        const populatedChat = await Chat.findById(chatId)
          .populate('messages.sender', 'name email profilePicture')
          .populate('lastMessageBy', 'name profilePicture');

        const messageData = populatedChat.messages[populatedChat.messages.length - 1];

        // Emit to all participants in the chat room
        io.to(`chat_${chatId}`).emit('new_message', {
          chatId,
          message: messageData,
          chat: {
            lastMessage: chat.lastMessage,
            lastMessageAt: chat.lastMessageAt,
            unreadCount: Object.fromEntries(chat.unreadCount),
          },
        });

        // Notify participants who are not in the chat room
        chat.participants.forEach((participantId) => {
          if (participantId.toString() !== socket.userId) {
            io.to(`user_${participantId}`).emit('chat_notification', {
              chatId,
              message: messageData,
              chat: {
                lastMessage: chat.lastMessage,
                lastMessageAt: chat.lastMessageAt,
                unreadCount: chat.unreadCount.get(participantId.toString()) || 0,
              },
            });

            // Create notification
            createNotification(
              participantId,
              'message',
              'New Message',
              `${socket.user.name}: ${message.substring(0, 50)}...`,
              { link: `/chat/${chatId}`, relatedJob: chat.relatedJob, relatedWork: chat.relatedWork }
            );
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', async (data) => {
      try {
        const { chatId, isTyping } = data;
        const chat = await Chat.findById(chatId);
        
        if (chat && chat.participants.includes(socket.userId)) {
          socket.to(`chat_${chatId}`).emit('user_typing', {
            chatId,
            userId: socket.userId,
            userName: socket.user.name,
            isTyping,
          });
        }
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    // Handle mark as read
    socket.on('mark_read', async (data) => {
      try {
        const { chatId } = data;
        await markChatAsRead(chatId, socket.userId);
        
        const chat = await Chat.findById(chatId);
        if (chat) {
          io.to(`chat_${chatId}`).emit('messages_read', {
            chatId,
            userId: socket.userId,
            unreadCount: Object.fromEntries(chat.unreadCount),
          });
        }
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);
      
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        status: 'offline',
      });
    });
  });
};

// Helper function to mark chat as read
const markChatAsRead = async (chatId, userId) => {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return;

    // Mark all unread messages as read
    chat.messages.forEach((msg) => {
      const alreadyRead = msg.readBy.some(
        (read) => read.user.toString() === userId
      );
      if (!alreadyRead && msg.sender.toString() !== userId) {
        msg.readBy.push({
          user: userId,
          readAt: new Date(),
        });
      }
    });

    // Reset unread count
    chat.unreadCount.set(userId.toString(), 0);
    await chat.save();
  } catch (error) {
    console.error('Error marking chat as read:', error);
  }
};

export { onlineUsers };

