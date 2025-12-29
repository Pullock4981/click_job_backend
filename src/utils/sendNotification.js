import Notification from '../models/Notification.js';
import { getIO } from '../socket/socketServer.js';

export const createNotification = async (userId, type, title, message, options = {}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      link: options.link || '',
      relatedJob: options.relatedJob || null,
      relatedWork: options.relatedWork || null,
      relatedChat: options.relatedChat || null,
      metadata: options.metadata || {},
    });

    // Emit real-time notification via Socket.io
    try {
      const io = getIO();
      if (io) {
        io.to(`user_${userId}`).emit('new_notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        });
      }
    } catch (socketError) {
      // Don't fail if Socket.io is not available
      console.warn('Socket.io notification failed:', socketError.message);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

