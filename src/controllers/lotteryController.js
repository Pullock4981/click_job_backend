import Lottery from '../models/Lottery.js';

export const getLotteries = async (req, res) => {
    try {
        const lotteries = await Lottery.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: lotteries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createLottery = async (req, res) => {
    try {
        const lottery = await Lottery.create(req.body);
        res.status(201).json({ success: true, data: lottery });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateLottery = async (req, res) => {
    try {
        const lottery = await Lottery.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: lottery });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteLottery = async (req, res) => {
    try {
        await Lottery.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Lottery deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
