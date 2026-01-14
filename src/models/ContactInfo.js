import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
    title: { type: String, default: 'Contact Us' },
    description: { type: String, default: 'Have questions, feedback, or need support? We\'re here to help — reach out anytime!' },
    emailSupport: { type: String, default: 'support@example.com' },
    liveChat: {
        time: { type: String, default: '10:00 AM - 02:00 AM (BDT)' },
        details: { type: String, default: 'Chat with us directly from the website' }
    },
    socialMedia: {
        facebook: { type: String, default: '' },
        telegram: { type: String, default: '' },
        instagram: { type: String, default: '' }
    }
}, { timestamps: true });

const ContactInfo = mongoose.model('ContactInfo', contactInfoSchema);

export default ContactInfo;
