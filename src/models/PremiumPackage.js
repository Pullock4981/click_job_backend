import mongoose from 'mongoose';

const premiumPackageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: Number, required: true }, // in days
    cost: { type: Number, required: true },
    features: { type: [String], default: [] }
}, { timestamps: true });

const PremiumPackage = mongoose.model('PremiumPackage', premiumPackageSchema);

export default PremiumPackage;
