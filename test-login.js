require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const axios = require('axios');

const EMAIL = 'birimajans@gmail.com';
const PASSWORD = 'Birim123.';

async function testLogin() {
  try {
    // First, connect to MongoDB to verify the user exists with correct credentials
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get the user directly from MongoDB
    const user = await mongoose.connection.collection('users').findOne({ email: EMAIL });

    if (!user) {
      console.error('User not found in the database!');
      process.exit(1);
    }

    console.log('User found in database:');
    console.log(`- Name: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Company ID: ${user.companyId}`);

    // Verify password hash is valid
    if (!user.auth || !user.auth.password) {
      console.error('User password data is missing or incorrect!');
      process.exit(1);
    }

    // Test password manually
    const isPasswordValid = await bcrypt.compare(PASSWORD, user.auth.password);
    console.log(`Manual password verification: ${isPasswordValid ? 'PASSED' : 'FAILED'}`);

    if (!isPasswordValid) {
      console.error('Password hash in database does not match the expected password!');
      
      // Update password directly in the database
      console.log('Updating password in database...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(PASSWORD, salt);
      
      const result = await mongoose.connection.collection('users').updateOne(
        { email: EMAIL },
        { $set: { 'auth.password': hashedPassword } }
      );
      
      console.log(`Password updated: ${result.modifiedCount > 0 ? 'YES' : 'NO'}`);
    }

    // Now test the actual login API
    console.log('\nTesting login API...');
    try {
      const response = await axios.post('http://localhost:5000/v1/auth/login', {
        email: EMAIL,
        password: PASSWORD
      });
      
      console.log('API Login successful!');
      console.log('User details from API:');
      console.log(`- Name: ${response.data.user.name}`);
      console.log(`- Email: ${response.data.user.email}`);
      console.log(`- Role: ${response.data.user.role}`);
    } catch (apiError) {
      console.error('API Login failed!');
      console.error('Error:', apiError.response ? apiError.response.data : apiError.message);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testLogin(); 