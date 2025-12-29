import Game from '../models/Game.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../utils/sendNotification.js';

// @desc    Get available games
// @route   GET /api/games/available
// @access  Public
export const getAvailableGames = async (req, res) => {
  try {
    const games = [
      {
        type: 'quiz',
        name: 'Quiz Challenge',
        description: 'Answer questions and earn rewards',
        maxEarnings: 5.0,
      },
      {
        type: 'puzzle',
        name: 'Puzzle Game',
        description: 'Solve puzzles and win prizes',
        maxEarnings: 3.0,
      },
      {
        type: 'memory',
        name: 'Memory Game',
        description: 'Test your memory skills',
        maxEarnings: 4.0,
      },
      {
        type: 'typing',
        name: 'Typing Speed',
        description: 'Improve typing speed and earn',
        maxEarnings: 2.0,
      },
      {
        type: 'click',
        name: 'Click Challenge',
        description: 'Click as fast as you can',
        maxEarnings: 1.0,
      },
    ];

    res.status(200).json({
      success: true,
      data: { games },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Submit game result
// @route   POST /api/games/play
// @access  Private
export const playGame = async (req, res) => {
  try {
    const { gameType, score, level, duration, metadata } = req.body;

    if (!gameType || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Game type and score are required',
      });
    }

    // Calculate earnings based on score (simple formula)
    const baseEarning = 0.1;
    const earnings = Math.min((score / 100) * baseEarning, 5.0); // Max $5

    // Create game record
    const game = await Game.create({
      user: req.user._id,
      gameType,
      score,
      earnings,
      level: level || 1,
      duration: duration || 0,
      status: 'completed',
      metadata: metadata || {},
    });

    // Add earnings to user wallet
    const user = await User.findById(req.user._id);
    user.walletBalance += earnings;
    user.totalEarnings += earnings;
    await user.save();

    // Create transaction
    await Transaction.create({
      user: req.user._id,
      type: 'bonus',
      amount: earnings,
      status: 'completed',
      description: `Earnings from ${gameType} game`,
      metadata: { gameId: game._id, score, level },
    });

    // Notify user
    await createNotification(
      req.user._id,
      'system',
      'Game Earnings',
      `You earned $${earnings.toFixed(2)} from playing ${gameType}!`,
      { link: '/games' }
    );

    res.status(200).json({
      success: true,
      message: 'Game result saved',
      data: { game, earnings, walletBalance: user.walletBalance },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get my game scores
// @route   GET /api/games/my-scores
// @access  Private
export const getMyScores = async (req, res) => {
  try {
    const { gameType, page = 1, limit = 20 } = req.query;

    const query = { user: req.user._id };
    if (gameType) query.gameType = gameType;

    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Game.countDocuments(query);

    // Calculate stats
    const totalEarnings = games.reduce((sum, g) => sum + g.earnings, 0);
    const totalGames = await Game.countDocuments({ user: req.user._id });
    const bestScore = await Game.findOne({ user: req.user._id })
      .sort({ score: -1 })
      .select('score gameType');

    res.status(200).json({
      success: true,
      data: {
        games,
        stats: {
          totalGames,
          totalEarnings,
          bestScore: bestScore ? bestScore.score : 0,
          bestGameType: bestScore ? bestScore.gameType : null,
        },
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

// @desc    Get leaderboard
// @route   GET /api/games/leaderboard
// @access  Public
export const getLeaderboard = async (req, res) => {
  try {
    const { gameType, period = 'all' } = req.query;

    let dateFilter = {};
    if (period === 'daily') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    } else if (period === 'weekly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'monthly') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const query = { ...dateFilter };
    if (gameType) query.gameType = gameType;

    // Aggregate to get top players
    const leaderboard = await Game.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$user',
          totalScore: { $sum: '$score' },
          totalEarnings: { $sum: '$earnings' },
          gamesPlayed: { $sum: 1 },
          bestScore: { $max: '$score' },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          profilePicture: '$user.profilePicture',
          totalScore: 1,
          totalEarnings: 1,
          gamesPlayed: 1,
          bestScore: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: { leaderboard, period },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

