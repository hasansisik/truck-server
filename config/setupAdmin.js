const User = require('../models/User');

const setupAdminUser = async () => {
  try {
    // Check if admin user with the specified email already exists
    const adminEmail = 'birimajans@gmail.com';
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      console.log('Creating default admin user...');
      
      // Create the admin user
      const adminUser = new User({
        name: 'Admin',
        email: adminEmail,
        role: 'admin',
        isVerified: true,
        status: 'active',
        companyId: 'default',
        auth: {
          password: 'Birim123.'
        }
      });
      
      await adminUser.save();
      console.log('Default admin user created successfully!');
    } else {
      console.log('Admin user already exists, skipping creation.');
    }
  } catch (error) {
    console.error('Error setting up admin user:', error);
  }
};

module.exports = setupAdminUser; 