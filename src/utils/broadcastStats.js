import { getIO } from '../socket/socketServer.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Transaction from '../models/Transaction.js';
import Work from '../models/Work.js';

export const broadcastAdminStats = async () => {
    try {
        const io = getIO();

        const totalUsers = await User.countDocuments();
        const activeJobs = await Job.countDocuments({ status: { $in: ['open', 'in-progress'] } });
        const pendingWorks = await Work.countDocuments({ status: 'pending' });

        const totalTransactions = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const totalVolume = totalTransactions[0]?.total || 0;

        // Last 7 days graph data
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            return d;
        }).reverse();

        const graphData = await Promise.all(last7Days.map(async (date) => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayUsers = await User.countDocuments({ createdAt: { $gte: date, $lt: nextDay } });
            const dayEarnings = await Transaction.aggregate([
                { $match: { type: 'earning', status: 'completed', createdAt: { $gte: date, $lt: nextDay } } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);

            return {
                date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                users: dayUsers,
                earnings: dayEarnings[0]?.total || 0,
            };
        }));

        const stats = {
            users: { total: totalUsers },
            jobs: { active: activeJobs },
            works: { pending: pendingWorks },
            transactions: { totalVolume },
            graphData
        };

        io.emit('admin_stats_update', stats);
    } catch (error) {
        console.error('Error broadcasting admin stats:', error);
    }
};
