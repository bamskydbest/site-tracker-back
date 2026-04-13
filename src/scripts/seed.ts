import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    const exists = await Admin.findOne({ role: 'superadmin' });
    if (exists) {
      exists.name = 'Superadmin';
      exists.email = 'sites@knetgh.net';
      exists.password = 'sitekn3t@26';
      exists.role = 'superadmin';
      exists.status = 'active';
      await exists.save();
      console.log('Superadmin updated: sites@knetgh.net / sitekn3t@26');
    } else {
      await Admin.create({
        name: 'Superadmin',
        email: 'sites@knetgh.net',
        password: 'sitekn3t@26',
        role: 'superadmin',
        status: 'active',
      });
      console.log('Superadmin created: sites@knetgh.net / sitekn3t@26');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
