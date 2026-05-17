const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create geospatial indexes after connection
    await createIndexes();
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    await db.collection('users').createIndex({ location: '2dsphere' });
    await db.collection('servicerequests').createIndex({ location: '2dsphere' });
    console.log('✅ Geospatial indexes created');
  } catch (error) {
    console.log('ℹ️ Indexes already exist or error:', error.message);
  }
};

module.exports = connectDB;