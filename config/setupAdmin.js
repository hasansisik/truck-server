const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const connectDB = require('./connectDB');

const setupUsers = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // Check if superadmin exists
    const superadminExists = await User.findOne({ email: 'superadmin@example.com' });
    if (!superadminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'superadmin@example.com',
        auth: { password: 'password123' },
        role: 'superadmin',
        isVerified: true,
        companyId: 'default'
      });
      console.log('Superadmin user created.');
    }

    // Check if admin exists
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        auth: { password: 'password123' },
        role: 'admin',
        isVerified: true,
        companyId: 'default'
      });
      console.log('Admin user created.');
    }

    // Check if regular user exists
    const userExists = await User.findOne({ email: 'user@example.com' });
    if (!userExists) {
      await User.create({
        name: 'Regular User',
        email: 'user@example.com',
        auth: { password: 'password123' },
        role: 'user',
        isVerified: true,
        companyId: 'default'
      });
      console.log('Regular user created.');
    }

    console.log('Setup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
};

setupUsers(); 