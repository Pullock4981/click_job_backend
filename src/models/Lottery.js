import mongoose from 'mongoose';

const lotterySchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    winner: { type: Number, default: 0 }, // Number of winners
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    banner: { type: String, default: '' },
    ticketSold: { type: Number, default: 0 },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
    tickets: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ticketNumber: String,
        isWinner: { type: Boolean, default: false }
    }]
}, { timestamps: true });

const Lottery = mongoose.model('Lottery', lotterySchema);

export default Lottery;
