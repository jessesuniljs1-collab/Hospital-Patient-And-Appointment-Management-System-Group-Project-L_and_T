const mongoose = require('mongoose');
const { mongoUri } = require('./env');

let embeddedServer = null;

const connectDB = async () => {
  try {
    // Attempt standard connection with 3s timeout
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // If standard connection fails and not in production, fallback to embedded MongoMemoryServer
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log(`⚠️ Local MongoDB (${mongoUri}) not detected. Starting embedded MongoDB engine...`);
        const { MongoMemoryServer } = require('mongodb-memory-server');
        embeddedServer = await MongoMemoryServer.create({
          instance: { port: 27017, dbName: 'hospital_management' }
        }).catch(async () => {
          // In case port 27017 is busy, allocate a dynamic port
          return await MongoMemoryServer.create({
            instance: { dbName: 'hospital_management' }
          });
        });

        const fallbackUri = embeddedServer.getUri();
        const conn = await mongoose.connect(fallbackUri);
        console.log(`✅ Embedded MongoDB Connected: ${conn.connection.host} (${fallbackUri})`);
        return conn;
      } catch (embeddedErr) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.error(`Embedded MongoDB Error: ${embeddedErr.message}`);
        process.exit(1);
      }
    } else {
      console.error(`MongoDB Connection Error: ${error.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
