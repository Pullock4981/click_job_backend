import mongoose from 'mongoose';

const adsRateSchema = new mongoose.Schema({
    duration: { type: Number, required: true }, // in days
    cost: { type: Number, required: true },
}, { timestamps: true });

const AdsRate = mongoose.model('AdsRate', adsRateSchema);

export default AdsRate;
