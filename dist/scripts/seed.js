import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';
dotenv.config();
const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        const exists = await Admin.findOne({ email: 'admin@sitetracker.com' });
        if (exists) {
            // Ensure role and status are correct even if the record predates these fields
            exists.role = 'superadmin';
            exists.status = 'active';
            await exists.save();
            console.log('Default admin updated: role=superadmin, status=active');
        }
        else {
            await Admin.create({
                name: 'Admin',
                email: 'admin@sitetracker.com',
                password: 'admin123',
                role: 'superadmin',
                status: 'active',
            });
            console.log('Default admin created: admin@sitetracker.com / admin123');
        }
        await mongoose.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};
seed();
