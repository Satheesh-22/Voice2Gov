// src/utils/seedData.js
// Run with:  node src/utils/seedData.js
// Clears the DB and inserts sample users + complaints for dev/testing

require('dotenv').config();
const mongoose  = require('mongoose');
const User      = require('../models/User');
const Complaint = require('../models/Complaint');
const { analyzeComplaint } = require('./nlpEngine');
const logger    = require('../config/logger');

const SAMPLE_USERS = [
  { name: 'Admin User',    email: 'admin@voice2gov.in',  password: 'Admin@123',   role: 'admin' },
  { name: 'Aravinth Kumar', email: 'aravinth@example.com', password: 'Test@1234', role: 'citizen' },
  { name: 'PWD Officer',   email: 'pwd@voice2gov.in',    password: 'Dept@1234',   role: 'department', department: 'Infrastructure' },
  { name: 'EB Officer',    email: 'eb@voice2gov.in',     password: 'Dept@1234',   role: 'department', department: 'Electricity' },
];

const SAMPLE_COMPLAINTS = [
  { title: 'Exposed live wire on street',  description: 'There is a dangerously exposed electrical wire hanging low at the corner of North Road — very urgent!', address: 'North Rd corner, Erode' },
  { title: 'Fallen tree blocks footpath',  description: 'A large tree fell after the storm and is blocking the footpath on Green Boulevard completely.',       address: 'Green Blvd, Erode' },
  { title: 'Large pothole on Main St',     description: 'There is a dangerous pothole near the intersection that has damaged two cars already.',               address: '14 Main St, Erode' },
  { title: 'Loud music after midnight',    description: 'A nearby venue is playing extremely loud music well past midnight every weekend.',                    address: 'West St, Erode' },
  { title: 'Broken streetlight — Park Ave', description: 'The streetlight at Park Ave has been broken for two weeks creating a safety hazard.',               address: 'Park Ave, Erode' },
  { title: 'Overflowing garbage bin near school', description: 'The garbage bin on School Rd has been overflowing for days posing a health risk.',            address: 'School Rd, Perundurai' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/voice2gov');
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data
    await Promise.all([User.deleteMany({}), Complaint.deleteMany({})]);
    logger.info('Existing data cleared');

    // Create users
    const users = await User.create(SAMPLE_USERS);
    const citizen = users.find((u) => u.role === 'citizen');
    logger.info(`Created ${users.length} users`);

    // Create complaints with AI analysis
    const complaints = SAMPLE_COMPLAINTS.map((c) => {
      const ai = analyzeComplaint(c.description, c.title);
      return {
        title: c.title,
        description: c.description,
        location: { address: c.address },
        submittedBy: citizen._id,
        aiAnalysis: ai,
        assignedDepartment: ai.department,
        statusHistory: [{ status: 'Submitted', note: 'Seeded complaint', updatedByName: citizen.name }],
      };
    });

    await Complaint.create(complaints);
    logger.info(`Created ${complaints.length} sample complaints`);

    logger.info('✅  Seed complete');
    logger.info('─────────────────────────────');
    logger.info('Admin login  → admin@voice2gov.in   / Admin@123');
    logger.info('Citizen login→ aravinth@example.com / Test@1234');
    logger.info('─────────────────────────────');
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
