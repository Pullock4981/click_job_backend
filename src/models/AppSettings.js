import mongoose from 'mongoose';

const appSettingsSchema = new mongoose.Schema({
    welcomeBonus: { type: Number, default: 0 },
    dollarRate: { type: Number, default: 110 },
    jobFeePercentage: { type: Number, default: 0 },
    withdrawFee: { type: Number, default: 0 },
    withdrawMinimum: { type: Number, default: 0 },
    adminMainWallet: { type: Number, default: 0 },
    screenshotCharge: { type: Number, default: 0 },
    screenshotChargeStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('AppSettings', appSettingsSchema);
