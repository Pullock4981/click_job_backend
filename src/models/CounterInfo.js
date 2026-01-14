import mongoose from 'mongoose';

const counterItemSchema = {
    text: { type: String, default: '' },
    count: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    show: { type: String, enum: ['live', 'hidden'], default: 'live' },
    icon: { type: String, default: '' }
};

const counterInfoSchema = new mongoose.Schema({
    totalJobs: counterItemSchema,
    totalUsers: counterItemSchema,
    taskDone: counterItemSchema,
    paid: counterItemSchema
}, { timestamps: true });

const CounterInfo = mongoose.model('CounterInfo', counterInfoSchema);

export default CounterInfo;
