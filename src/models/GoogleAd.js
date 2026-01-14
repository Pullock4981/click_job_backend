import mongoose from 'mongoose';

const googleAdSchema = new mongoose.Schema({
    position: { type: String, required: true }, // e.g., 'Sidebar', 'Header', 'Footer', 'Below Post'
    code: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

const GoogleAd = mongoose.model('GoogleAd', googleAdSchema);

export default GoogleAd;
