const mongoose = require('mongoose');

const connectDB = async () => {

  mongoose.connection.on('connecting', () => console.log('Connecting to MongoDB...'));
  mongoose.connection.on('connected', () => console.log('Connected!'));
  mongoose.connection.on('error', (err) => console.log('Connection error:', err.message));
  mongoose.connection.on('timeout', () => console.log('Connection timed out'));

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} ✅`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;