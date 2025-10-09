// src/config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in .env");

  try {
    const conn = await mongoose.connect(uri); // no extra options needed in Mongoose 6+
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ DB Error: ${err.message}`);
    process.exit(1); // stop the app if DB fails
  }
};

export default connectDB;
