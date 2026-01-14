import mongoose from 'mongoose';

const companyContentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            unique: true, // e.g., 'about-us'
            enum: ['about-us', 'privacy-policy', 'terms-conditions', 'refund-policy'],
        },
        title: {
            type: String,
            required: true,
            default: 'About Us',
        },
        content: {
            type: String,
            required: true,
            default: '',
        },
        image: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

const CompanyContent = mongoose.model('CompanyContent', companyContentSchema);

export default CompanyContent;
