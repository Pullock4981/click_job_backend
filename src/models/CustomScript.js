import mongoose from 'mongoose';

const customScriptSchema = new mongoose.Schema({
    type: { type: String, enum: ['Head', 'Footer'], default: 'Head' },
    script: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('CustomScript', customScriptSchema);
