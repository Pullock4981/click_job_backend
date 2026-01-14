import mongoose from 'mongoose';

const jobSubCategorySchema = new mongoose.Schema({
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCategory', required: true },
    name: { type: String, required: true },
    minCost: { type: Number, required: true, default: 0 }
}, { timestamps: true });

export default mongoose.model('JobSubCategory', jobSubCategorySchema);
