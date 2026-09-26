// scripts/revertUserRole.js
// Usage: node scripts/revertUserRole.js email@example.com

require('dotenv').config();
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const email = process.argv[2] || 'e2e.tester@example.com';

(async () => {
  try {
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found:', email);
      process.exit(2);
    }
    user.role = 'citizen';
    await user.save();
    console.log('Reverted user role to citizen:', user.email, user._id.toString());
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
