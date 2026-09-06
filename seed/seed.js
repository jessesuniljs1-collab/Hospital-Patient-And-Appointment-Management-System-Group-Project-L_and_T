const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const seedData = require('./seedHelper');

const runSeed = async () => {
  try {
    console.log('🔄 Connecting to MongoDB for seeding...');
    await connectDB();
    await seedData();

    console.log('\n====================================================');
    console.log('Demo Credentials for Testing:');
    console.log('  Admin:   admin@hospital.com     / Admin@123');
    console.log('  Doctor:  dr.sharma@hospital.com  / Doctor@123 (Cardiology)');
    console.log('  Doctor:  dr.patel@hospital.com   / Doctor@123 (Neurology)');
    console.log('  Patient: patient1@example.com   / Patient@123');
    console.log('  Patient: patient2@example.com   / Patient@123');
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

runSeed();
