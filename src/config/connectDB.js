import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async (url) => {
  return await mongoose.connect(url, {
    // dbName: process.env.NODE_ENV == "development" ? "LeaveMS" : "LeaveMS-Live",
    dbName: "LeaveMS-Live",
    // dbName: "HRCore-Live",
  });
};

export default connectDB;
