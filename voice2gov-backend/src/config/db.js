// src/config/db.js
// MongoDB connection with retry logic and event logging

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/voice2gov';

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    // Retry once after 5 s, then exit so a process manager can restart
    setTimeout(async () => {
      try {
        await mongoose.connect(uri, options);
        console.log('✅  MongoDB reconnected');
      } catch (err) {
        console.error('❌  MongoDB retry failed. Exiting.');
        process.exit(1);
      }
    }, 5000);
  }
};

// Log lifecycle events
mongoose.connection.on('disconnected', () =>
  console.warn('⚠️   MongoDB disconnected')
);
mongoose.connection.on('reconnected', () =>
  console.log('🔄  MongoDB reconnected')
);

module.exports = connectDB;
