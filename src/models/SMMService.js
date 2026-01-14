import mongoose from 'mongoose';

const smmServiceSchema = new mongoose.Schema({
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'SMMCategory', required: true },
    title: { type: String, required: true },
    chargePer1000: { type: Number, required: true },
    notice: { type: String },
    icon: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

const SMMService = mongoose.model('SMMService', smmServiceSchema);

export default SMMService;
