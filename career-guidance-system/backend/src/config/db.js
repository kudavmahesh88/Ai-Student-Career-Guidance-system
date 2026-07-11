const mongoose = require("mongoose");

/**
 * connectDB
 * Establishes a connection to MongoDB using the URI defined in environment variables.
 * Exits the process if the connection fails, since the API cannot function without a DB.
 */
const connectDB = async () => {
  try {
    console.log("URI:", process.env.MONGO_URI);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
   console.error("FULL ERROR:");
   console.error(error);
   process.exit(1);
  }
};

module.exports = connectDB;
