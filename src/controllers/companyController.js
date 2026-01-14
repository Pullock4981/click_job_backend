import CompanyContent from '../models/CompanyContent.js';

// @desc    Get company content by type
// @route   GET /api/company/:type
// @access  Public
export const getCompanyContent = async (req, res) => {
    try {
        const { type } = req.params;
        let content = await CompanyContent.findOne({ type });

        if (!content) {
            // Create default if not exists (for easy setup)
            if (['about-us', 'privacy-policy', 'terms-conditions', 'refund-policy'].includes(type)) {
                content = await CompanyContent.create({ type, title: type.replace('-', ' ').toUpperCase(), content: 'Content goes here...' });
            } else {
                return res.status(404).json({ success: false, message: 'Content not found' });
            }
        }

        res.status(200).json({ success: true, data: content });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update company content
// @route   PUT /api/company/:type
// @access  Private (Admin)
export const updateCompanyContent = async (req, res) => {
    try {
        const { type } = req.params;
        const { title, content, image } = req.body;

        let companyContent = await CompanyContent.findOne({ type });

        if (!companyContent) {
            // Create if missing
            companyContent = await CompanyContent.create({ type, title, content, image });
        } else {
            companyContent.title = title || companyContent.title;
            companyContent.content = content || companyContent.content;
            if (image !== undefined) companyContent.image = image;
            await companyContent.save();
        }

        res.status(200).json({ success: true, data: companyContent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
