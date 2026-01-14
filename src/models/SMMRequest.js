import mongoose from 'mongoose';

const smmRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'SMMService', required: true },
    link: { type: String, required: true },
    quantity: { type: Number, required: true },
    charge: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled', 'refunded'], default: 'pending' },
    reason: { type: String }
}, { timestamps: true });

const SMMRequest = mongoose.model('SMMRequest', smmRequestSchema);

export default SMMRequest;
