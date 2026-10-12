// config/db.js — Manages the MongoDB Atlas connection using Mongoose.
//
// Why a separate file?
//   Keeping database logic here means server.js doesn't need to know
//   anything about how the connection is established. If you ever switch
//   databases, you only change this one file.

const mongoose = require('mongoose');

/**
 * connectDB — Connects to MongoDB Atlas using the URI stored in the
 * MONGODB_URI environment variable.
 *
 * Call this once at application startup and await it so the server
 * only begins accepting requests after the database is ready.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    // Exit the process so the application does not run without a database.
    // Without this, the server would start but every database operation
    // would fail silently, which is very hard to debug.
    process.exit(1);
  }
};

module.exports = connectDB;
