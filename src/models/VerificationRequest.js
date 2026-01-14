import mongoose from 'mongoose';

const verificationRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentType: {
        type: String,
        default: 'NID'
    },
    cardNumber: {
        type: String,
        required: true
    },
    frontImage: {
        type: String,
        required: true
    },
    userImage: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String
    }
}, { timestamps: true });

const VerificationRequest = mongoose.model('VerificationRequest', verificationRequestSchema);

export default VerificationRequest;
