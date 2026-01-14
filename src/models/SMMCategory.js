import mongoose from 'mongoose';

const smmCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    icon: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

const SMMCategory = mongoose.model('SMMCategory', smmCategorySchema);

export default SMMCategory;
