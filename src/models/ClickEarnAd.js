import mongoose from 'mongoose';

const clickEarnAdSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    waitingTime: { type: Number, required: true }, // in seconds
    earning: { type: Number, required: true },
    link: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    views: { type: Number, default: 0 }
}, { timestamps: true });

const ClickEarnAd = mongoose.model('ClickEarnAd', clickEarnAdSchema);

export default ClickEarnAd;
