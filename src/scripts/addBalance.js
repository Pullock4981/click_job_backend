import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const addBalance = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await User.updateMany(
            {},
            { $inc: { depositBalance: 1000 } }
        );

        console.log(`Updated ${result.modifiedCount} users with +$1000 deposit balance.`);
        process.exit(0);
    } catch (error) {
        console.error('Error adding balance:', error);
        process.exit(1);
    }
};

addBalance();
