import WebsiteInfo from '../models/WebsiteInfo.js';

export const getPublicWebsiteInfo = async (req, res) => {
    try {
        let info = await WebsiteInfo.findOne();
        if (!info) {
            info = await WebsiteInfo.create({});
        }
        res.status(200).json({ success: true, data: info });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
