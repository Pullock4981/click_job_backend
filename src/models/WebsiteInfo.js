import mongoose from 'mongoose';

const websiteInfoSchema = new mongoose.Schema({
    applicationTitle: { type: String, default: 'MicroJob' },
    siteEmail: { type: String, default: '' },
    mobileNo: { type: String, default: '' },
    phoneNo: { type: String, default: '' },
    rejectRatio: { type: Number, default: 100 },
    userBlockRatio: { type: Number, default: 0 },
    minimumJobCost: { type: Number, default: 0.01 },
    minWorkerAds: { type: Number, default: 5 },
    minDurationAds: { type: Number, default: 5 },
    minCostPerWorkerAds: { type: Number, default: 0.001 },
    minCostPerDurationAds: { type: Number, default: 0.001 },
    referralDepositCommission: { type: Number, default: 0 },
    referralEarningCommission: { type: Number, default: 0 },
    lotterySystem: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    instantVerify: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' },
    needUserVerification: { type: String, enum: ['Yes', 'No'], default: 'No' },
    workAutoApprove: { type: Number, default: 24 },
    referralNotice: { type: String, default: '' },
    lotteryNotice: { type: String, default: '' },
    instantDepositNote: { type: String, default: '' },
    accountVerifyNote: { type: String, default: '' },
    description: { type: String, default: '' },
    metaKeyword: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    address: { type: String, default: '' },
    googleMap: { type: String, default: '' },
    favicon: { type: String, default: '' },
    logo: { type: String, default: '' },
    facebookGroup: { type: String, default: '' },
    youtube: { type: String, default: '' },
    telegram: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('WebsiteInfo', websiteInfoSchema);
