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

    // Helper to ensure AI Bot User exists
    const getAiUser = async () => {
      let aiUser = await User.findOne({ email: 'ai@clickjob.com.bd' });
      if (!aiUser) {
        try {
          aiUser = await User.create({
            name: 'ClickJob AI',
            email: 'ai@clickjob.com.bd',
            password: 'ai_secure_password_123',
            role: 'admin',
            isVerified: true
          });
        } catch (error) {
          // If race condition or duplicate, fetch again
          if (error.code === 11000) {
            aiUser = await User.findOne({ email: 'ai@clickjob.com.bd' });
          } else {
            throw error;
          }
        }
      }
      return aiUser;
    };

    // Handle AI Chat with Persistence
    socket.on('ai_chat', async (data) => {
      try {
        const { message } = data;
        const lowerMsg = message.toLowerCase();
        let response = '';

        // 1. Get AI User
        const aiUser = await getAiUser();

        // 2. Find or Create Chat
        let chat = await Chat.findOne({
          participants: { $all: [socket.userId, aiUser._id] },
          type: 'support'
        });

        if (!chat) {
          chat = await Chat.create({
            participants: [socket.userId, aiUser._id],
            type: 'support',
            createdBy: socket.userId,
            messages: []
          });
        }

        // 3. Save User Message
        const userMsgObj = {
          sender: socket.userId,
          message: message,
          readBy: [{ user: socket.userId, readAt: new Date() }]
        };
        chat.messages.push(userMsgObj);

        // --- Advanced Rule-Based AI Logic ---
        const patterns = [
          // Greetings
          { regex: /\b(hi|hello|hey|greetings|sup)\b/i, response: "Hello there! 👋 How's it going? I'm here to help with your Click Job account." },
          { regex: /\b(good morning|good afternoon|good evening)\b/i, response: "Good day to you! ☀️ Hope you're having a productive time on Click Job." },

          // Small Talk / Status
          { regex: /\b(how are you|how r u|how do you do)\b/i, response: "I'm just a bot, but I'm functioning perfectly! 🤖 Thanks for asking. How are you doing?" },
          { regex: /\b(good|great|fine|well|awesome|cool)\b/i, response: "That's fantastic to hear! 🎉 Is there anything specific you'd like to do today, like finding a job or checking your wallet?" },
          { regex: /\b(bad|sad|not good|tired)\b/i, response: "I'm sorry to hear that. 😔 Maybe completing a few quick tasks and earning some cash will cheer you up?" },
          { regex: /\b(who are you|what are you)\b/i, response: "I'm the Click Job Support Assistant. I can help you navigate the platform, understand deposits, and find work." },

          // Core Functionality - Deposits & Wallet
          { regex: /\b(deposit|add money|fund|bkash|nagad)\b/i, response: "Funding your account is easy! 💰 Go to your **Wallet** page, click 'Deposit', and choose bKash or Crypto. It's usually instant." },
          { regex: /\b(withdraw|cash out|payout|payment)\b/i, response: "Nice! Ready to cash out? 💸 Withdrawals are processed within 24 hours. Just ensure you have the minimum balance needed ($5.00)." },
          { regex: /\b(balance|money|wallet)\b/i, response: "You can check your current balance in your Wallet or on the Dashboard. It updates instantly after every task!" },

          // Jobs & Earning
          { regex: /\b(job|work|task|earn|money)\b/i, response: "Looking to earn? 💼Check the 'Find Jobs' page. We have varied tasks like social media engagement, sign-ups, and more." },
          { regex: /\b(post|create job|employer)\b/i, response: "Want to hire? 🤝 You can switch to 'Employer' mode or just click 'Post a Job' to get workers for your tasks." },

          // Account & Verification
          { regex: /\b(verify|verification|id|kyc)\b/i, response: "Verification helps trust. 🛡️ Upload your ID in Settings > Verification to unlock more features and higher limits." },
          { regex: /\b(password|login|cant access)\b/i, response: "If you're having trouble logging in, try the 'Forgot Password' link on the login page, or contact admin@clickjob.com.bd." },

          // Referral
          { regex: /\b(refer|invite|friend|commission)\b/i, response: "Our Referral Program is generous! 🚀 share your link found in the 'Referral' page and earn a % of everything your friends earn." },

          // --- Site Specific Knowledge (Click Job) ---
          // --- Site Specific Knowledge (Click Job) ---
          { regex: /\b(what is|tell me|say me|know about|info|describe).{0,20}(click job|this site|the site|this platform|this app|about)\b/i, response: "Click Job is a premier micro-job platform connecting employers with workers. You can earn money by completing simple tasks like watching videos, liking posts, or signing up for services." },
          { regex: /\b(about|aboit).{0,10}(site|platform|click job)\b/i, response: "Click Job is a premier micro-job platform. We connect regular users with simple online tasks to earn real money. It's easy, safe, and paying!" },
          { regex: /\b(is this (site|app|platform) (legit|real|fake|safe)|scam|trusted)\b/i, response: "Yes, Click Job is 100% legitimate and safe! 🛡️ We prioritize user security and have strict payment policies to ensure everyone gets paid for their hard work." },
          { regex: /\b(owner|admin|CEO|founder)\b/i, response: "Click Job is managed by a dedicated team of administrators committed to fair freelancing. You can contact the admin team via this chat or email at admin@clickjob.com.bd." },

          // Fees & Limits
          { regex: /\b(fee|charge|commission)\b/i, response: "We keep fees low! Employers pay a small fee when posting jobs, and there's a minimal innovative service fee on withdrawals to maintain the platform." },
          { regex: /\b(minimum withdraw|min withdraw)\b/i, response: "The minimum withdrawal amount is just $5.00. Once you reach this, you can request a payout instantly." },
          { regex: /\b(how long|withdraw time|payment time)\b/i, response: "We process payments fast! ⚡ Most withdrawals via bKash or Crypto are completed within 24 hours, often much sooner." },

          // Premium / Membership
          { regex: /\b(premium|upgrade|vip|membership)\b/i, response: "Premium members get exclusive perks like higher job limits, priority support, and lower withdrawal fees. Check the 'Upgrade' section in your dashboard!" },

          // Rules
          { regex: /\b(multiple account|fake account)\b/i, response: "Please note: Creating multiple accounts is strictly prohibited. 🚫 It will lead to an immediate ban. One account per user, please!" },
          { regex: /\b(vpn|proxy)\b/i, response: "Usage of VPN or Proxy is not allowed as we need to verify your real location for tasks. Please turn it off to avoid account suspension." },

          // Tutorials
          { regex: /\b(how to (do|complete) (job|task)|tutorial)\b/i, response: "It's simple: 1. Find a job you like. 2. Read the instructions carefully. 3. Submit the required proof (screenshot/text). 4. Wait for employer approval!" },

          // Closing / Gratitude
          { regex: /\b(thank|thanks|thx|appreciate)\b/i, response: "You're very welcome! 😊 Happy to help. Let me know if you need anything else!" },
          { regex: /\b(bye|goodbye|see ya)\b/i, response: "Goodbye! 👋 Happy earning. Come back soon!" }
        ];

        // Find match
        const match = patterns.find(p => p.regex.test(message));

        if (match) {
          response = match.response;
        } else {
          // Smart Fallback
          const fallbacks = [
            "I'm listening technically, but I didn't quite catch that context. 🤖 Could you ask specifically about Click Job features, Deposits, or Rules?",
            "I'm still learning about Click Job every day! 📚 Could you rephrase that? I can explain how to earn, withdraw, or verifying your account.",
            "That's interesting! If it's about the site, ask me 'Is Click Job legit?' or 'How to earn?'. 💰",
            "I'm not sure about that specific topic. 🤔 But I can help you with anything related to this platform!"
          ];
          response = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
        // ----------------

        await chat.save(); // Save user message first

        // Emit typing
        socket.emit('ai_typing', { isTyping: true });


        // Simulate delay & Save AI Response
        setTimeout(async () => {
          try {
            // Fetch fresh instance to avoid VersionError
            const freshChat = await Chat.findById(chat._id);
            if (freshChat) {
              const aiMsgObj = {
                sender: aiUser._id,
                message: response,
                readBy: []
              };

              freshChat.messages.push(aiMsgObj);
              freshChat.lastMessage = response;
              freshChat.lastMessageAt = new Date();
              freshChat.lastMessageBy = aiUser._id;
              await freshChat.save();

              // Emit response to user
              socket.emit('ai_response', {
                message: response,
                timestamp: new Date(),
                senderId: aiUser._id.toString()
              });
            }
            socket.emit('ai_typing', { isTyping: false });
          } catch (err) {
            console.error('Error saving AI response:', err);
            socket.emit('error', { message: 'Failed to save AI response' });
          }

        }, 1000);

      } catch (error) {
        console.error('Error in AI chat:', error);
        socket.emit('error', { message: error.message || 'AI failed to respond' });
      }
    });

    // Get AI Chat History
    socket.on('get_ai_history', async () => {
      try {
        const aiUser = await getAiUser();
        const chat = await Chat.findOne({
          participants: { $all: [socket.userId, aiUser._id] },
          type: 'support'
        }).populate('messages.sender', 'name role'); // Populate to check sender

        if (chat) {
          // Map messages to frontend format
          const formattedMessages = chat.messages.map(msg => ({
            id: msg._id,
            text: msg.message,
            sender: msg.sender._id.toString() === socket.userId ? 'user' : 'ai',
            time: msg.createdAt
          }));
          socket.emit('ai_history', formattedMessages);
        } else {
          // Return default welcome message if no history
          socket.emit('ai_history', [{
            id: 'welcome',
            text: "Hello! 👋 I'm your Click Job Assistant. Ask me about deposits, withdrawals, or jobs!",
            sender: 'ai',
            time: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error fetching AI history:', error);
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

