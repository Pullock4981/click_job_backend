import mongoose from 'mongoose';

const imageSchema = {
    url: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
};

const headerNoticeSchema = new mongoose.Schema({
    headerTitle: {
        type: String,
        default: ''
    },
    noticeBoard: {
        type: String,
        default: ''
    },
    headerImg1: imageSchema,
    headerImg2: imageSchema,
    box1: imageSchema,
    box2: imageSchema,
    box3: imageSchema,
    box4: imageSchema,
    boxBg: imageSchema
}, { timestamps: true });

// Ensure only one document exists usually
const HeaderNotice = mongoose.model('HeaderNotice', headerNoticeSchema);

export default HeaderNotice;
