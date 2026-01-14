import mongoose from 'mongoose';

const spinSettingSchema = new mongoose.Schema({
    parts: [{
        bg: { type: String, default: '#ffffff' },
        mark: { type: Number, default: 0 }
    }],
    dailyMaxSpin: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('SpinSetting', spinSettingSchema);
