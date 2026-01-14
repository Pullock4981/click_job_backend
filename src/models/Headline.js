import mongoose from 'mongoose';

const headlineSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String, default: '#' },
    type: {
        type: String,
        enum: ['main', 'task-prove', 'applied-task', 'top-worker', 'top-job-poster', 'top-deposit', 'top-best', 'top-referral'],
        required: true
    }
}, { timestamps: true });

const Headline = mongoose.model('Headline', headlineSchema);

export default Headline;
