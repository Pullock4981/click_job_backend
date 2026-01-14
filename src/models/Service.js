import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    details: { type: String, required: true },
    image: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
