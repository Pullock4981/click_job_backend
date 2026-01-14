import mongoose from 'mongoose';

const locationZoneSchema = new mongoose.Schema({
    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    name: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('LocationZone', locationZoneSchema);
