import User from '../models/User.js';

export const trackLogin = async (req, res, next) => {
  if (req.user) {
    try {
      const ip =
        req.ip ||
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        'Unknown';
      const userAgent = req.get('user-agent') || '';

      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          loginHistory: {
            $each: [{ ip, userAgent, loginAt: new Date() }],
            $slice: -50, // Keep last 50 logins
          },
        },
      });
    } catch (error) {
      console.error('Error tracking login:', error);
      // Don't block the request if tracking fails
    }
  }
  next();
};

