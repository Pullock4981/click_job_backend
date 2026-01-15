
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from '../src/models/Transaction.js';
import User from '../src/models/User.js';

dotenv.config();

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const deposits = await Transaction.find({ type: 'deposit' });
        console.log('Deposits Found:', deposits.length);
        if (deposits.length > 0) {
            console.log('First Deposit:', JSON.stringify(deposits[0], null, 2));
        }

        // Check if any transaction exists for current user
        const users = await User.find({});
        console.log('Total Users:', users.length);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkDB();
