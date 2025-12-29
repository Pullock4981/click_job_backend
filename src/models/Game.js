import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gameType: {
      type: String,
      enum: ['quiz', 'puzzle', 'memory', 'typing', 'click', 'other'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    earnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'abandoned'],
      default: 'completed',
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index
gameSchema.index({ user: 1, createdAt: -1 });
gameSchema.index({ gameType: 1, score: -1 });
gameSchema.index({ createdAt: -1 });

const Game = mongoose.model('Game', gameSchema);

export default Game;

