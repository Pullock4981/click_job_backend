import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Work from '../models/Work.js';
import Transaction from '../models/Transaction.js';
import Referral from '../models/Referral.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/click_job';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB Connected for Seeding');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        await connectDB();

        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Job.deleteMany({});
        await Work.deleteMany({});
        await Transaction.deleteMany({});
        await Referral.deleteMany({});

        console.log('Creating Users...');

        // 1. Admin User
        const adminSalt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('password123', adminSalt);
        const admin = await User.create({
            name: 'Super Admin',
            email: 'admin@clickjob.com',
            password: adminHash,
            role: 'admin',
            status: 'active',
            isVerified: true,
            earningBalance: 1000,
            depositBalance: 5000,
            numericId: 10001
        });

        // 2. Employers (Job Posters) - Top Job Posters
        const employers = [];
        for (let i = 1; i <= 20; i++) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('password123', salt);
            const employer = await User.create({
                name: `Employer ${i}`,
                email: `employer${i}@example.com`,
                password: hash,
                role: 'user', // In this system, regular users can post jobs
                status: 'active',
                isVerified: true,
                depositBalance: Math.floor(Math.random() * 500) + 50, // For "Top Depositors"
                totalJobs: Math.floor(Math.random() * 50), // For "Top Job Posters" - Note: schema might not autosync this, so we set it
                numericId: 20000 + i
            });
            employers.push(employer);
        }

        // 3. Workers - Top Workers, Top Earners
        const workers = [];
        for (let i = 1; i <= 50; i++) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('password123', salt);
            const worker = await User.create({
                name: `Worker ${i}`,
                email: `worker${i}@example.com`,
                password: hash,
                role: 'user',
                status: 'active',
                isVerified: true,
                earningBalance: Math.floor(Math.random() * 200),
                totalEarnings: Math.floor(Math.random() * 500), // For "Top Workers" maybe?
                totalWithdrawals: Math.floor(Math.random() * 300), // For "Top Users" (withdrawals)
                totalReferrals: 0, // Will update when seeding referrals
                numericId: 30000 + i
            });
            workers.push(worker);
        }

        console.log('Creating Jobs...');
        const jobs = [];
        const categories = ['YouTube', 'Facebook', 'Instagram', 'TikTok', 'Telegram', 'Twitter'];

        for (let i = 0; i < 50; i++) {
            const employer = employers[Math.floor(Math.random() * employers.length)];
            const job = await Job.create({
                title: `Watch Video & Subscribe #${i + 1}`,
                description: 'Go to the link, watch for 2 minutes and subscribe. Send screenshot as proof.',
                category: categories[Math.floor(Math.random() * categories.length)],
                budget: 10 + Math.random() * 50,
                employer: employer._id,
                status: Math.random() > 0.2 ? 'open' : 'completed', // 80% open
                adminStatus: 'approved',
                workerNeed: 100,
                workerEarn: 0.02 + (Math.random() * 0.05),
                requiredProof: 'Screenshot of subscription',
                taskInstructions: ['Search channel', 'Watch video', 'Subscribe'],
                estimatedDays: 1
            });
            jobs.push(job);
        }

        console.log('Creating Work (Tasks)...');
        for (let i = 0; i < 200; i++) {
            const job = jobs[Math.floor(Math.random() * jobs.length)];
            const worker = workers[Math.floor(Math.random() * workers.length)];

            // Avoid duplicate work for same job/worker
            const existing = await Work.findOne({ job: job._id, worker: worker._id });
            if (existing) continue;

            const status = ['approved', 'rejected', 'pending'][Math.floor(Math.random() * 3)];

            await Work.create({
                job: job._id,
                worker: worker._id,
                employer: job.employer,
                status: status,
                submissionProof: 'https://via.placeholder.com/150',
                paymentAmount: job.workerEarn,
                paymentStatus: status === 'approved' ? 'paid' : 'pending',
                paidAt: status === 'approved' ? new Date() : null,
                submissionMessage: 'Done sir checking please',
                employerFeedback: status === 'rejected' ? 'Not done correctly' : 'Good job'
            });
        }

        console.log('Creating Referrals...');
        // Make some workers refer others
        for (let i = 0; i < 15; i++) {
            const referrer = workers[i];
            const referralCount = Math.floor(Math.random() * 5) + 1; // 1-5 referrals each

            for (let j = 0; j < referralCount; j++) {
                // Find a worker to be "referred" (use higher index workers to avoid cycles/self-referral issues easily)
                const referredIndex = 20 + i + j;
                if (referredIndex < workers.length) {
                    const referred = workers[referredIndex];

                    await Referral.create({
                        referrer: referrer._id,
                        referred: referred._id,
                        referralCode: referrer.referralCode || 'REF123',
                        status: 'active',
                        earnings: {
                            totalEarnings: Math.random() * 5,
                            depositEarnings: Math.random() * 2,
                            taskEarnings: Math.random() * 3
                        }
                    });

                    // Update referrer count
                    referrer.totalReferrals = (referrer.totalReferrals || 0) + 1;
                    await referrer.save();
                }
            }
        }

        console.log('Creating Transactions...');
        // Deposits (for Leaderboard)
        for (const emp of employers) {
            await Transaction.create({
                user: emp._id,
                type: 'deposit',
                amount: emp.depositBalance,
                status: 'completed',
                description: 'Deposit via Bkash',
                paymentMethod: 'bank'
            });
        }

        // Withdrawals (for Leaderboard)
        for (const worker of workers) {
            if (worker.totalWithdrawals > 0) {
                await Transaction.create({
                    user: worker._id,
                    type: 'withdrawal',
                    amount: worker.totalWithdrawals,
                    status: 'completed',
                    description: 'Withdrawal to Bkash',
                    paymentMethod: 'bank'
                });
            }
        }

        // Populate stats for Top Depositors specifically
        // Ensure some users have high deposit amounts
        const topDepositor = await User.findOne({ email: 'employer1@example.com' });
        if (topDepositor) {
            topDepositor.depositBalance = 5000;
            topDepositor.totalDeposits = 5000; // Add this field if schema allows or rely on aggregating transactions
            await topDepositor.save();

            await Transaction.create({
                user: topDepositor._id,
                type: 'deposit',
                amount: 5000,
                status: 'completed',
                description: 'Big Deposit',
                paymentMethod: 'bank'
            });
        }

        console.log('Seeding Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Seeding Failed:', error);
        process.exit(1);
    }
};

seedData();
