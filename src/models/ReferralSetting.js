import mongoose from 'mongoose';

const referralSettingSchema = new mongoose.Schema({
    generation: { type: Number, required: true, unique: true },
    percentage: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('ReferralSetting', referralSettingSchema);
