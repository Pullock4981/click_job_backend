import mongoose from 'mongoose';

const adminMessageSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('AdminMessage', adminMessageSchema);
