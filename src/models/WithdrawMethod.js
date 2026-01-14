import mongoose from 'mongoose';

const withdrawMethodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    icon: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

const WithdrawMethod = mongoose.model('WithdrawMethod', withdrawMethodSchema);

export default WithdrawMethod;
