import mongoose from 'mongoose';

const depositMethodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    account: { type: String, required: true },
    guideline: { type: String, required: true },
    icon: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

const DepositMethod = mongoose.model('DepositMethod', depositMethodSchema);

export default DepositMethod;
