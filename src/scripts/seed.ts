import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    const exists = await Admin.findOne({ email: 'admin@sitetracker.com' });
    if (exists) {
      console.log('Default admin already exists');
    } else {
      await Admin.create({
        name: 'Admin',
        email: 'admin@sitetracker.com',
        password: 'admin123',
        role: 'superadmin',
      });
      console.log('Default admin created: admin@sitetracker.com / admin123');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
