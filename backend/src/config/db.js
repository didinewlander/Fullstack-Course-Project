const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes('******')) {
    console.warn('MONGO_URI is not configured. Starting without database connection.');
    return;
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
};

module.exports = connectDB;
