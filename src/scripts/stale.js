// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import connectDB from "../config/connectDB.js";
// import Employee from "../v1/models/employee.model.js";
// import {
//   EmployeeLeaveBalance,
//   LeaveHistory,
// } from "../v1/models/leave.model.js";

// dotenv.config();

// const TENANT_ID = "6800a6704cc8c7225a28c870";

// async function rejectStaleLeaveRequests() {
//   console.log("Connecting to database...");
//   await connectDB(process.env.DB_URI);
//   console.log("Database connected successfully");

//   const oneWeekAgo = new Date();
//   oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

//   console.log("Finding pending leave requests older than a week...");

//   const staleLeaveRequests = await LeaveHistory.find({
//     tenantId: TENANT_ID,
//     status: "pending",
//     // createdAt: { $lt: oneWeekAgo },
//   }).populate([{ path: "employee" }, { path: "leaveType" }]);

//   console.log(`Found ${staleLeaveRequests.length} stale requests`);

//   for (const leaveHistory of staleLeaveRequests) {
//     console.log(
//       `Rejecting leave request ${leaveHistory._id} for employee ${leaveHistory.employee._id}`
//     );

//     // Update status to rejected
//     leaveHistory.status = "rejected";

//     // Restore the leave balance
//     const leaveBalance = await EmployeeLeaveBalance.findOne({
//       tenantId: TENANT_ID,
//       employeeId: leaveHistory.employee._id,
//       leaveTypeId: leaveHistory.leaveType._id,
//     });

//     if (leaveBalance) {
//       leaveBalance.balance += leaveHistory.duration;
//       await leaveBalance.save();
//       await leaveHistory.save();
//       console.log(
//         `Restored ${leaveHistory.duration} days to ${leaveHistory.employee._id} for leave type ${leaveHistory.leaveType._id}`
//       );
//     } else {
//       console.warn(
//         `No leave balance record found for employee ${leaveHistory.employee._id} and leave type ${leaveHistory.leaveType._id}`
//       );
//     }
//   }

//   console.log("Completed rejecting stale leave requests");
//   mongoose.connection.close();
// }

// rejectStaleLeaveRequests().catch((err) => {
//   console.error("Error:", err);
//   mongoose.connection.close();
// });

// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import connectDB from "../config/connectDB.js";
// import Employee from "../v1/models/employee.model.js";

// dotenv.config();

// const employeeId = "681a9a502d225831020d329a";

// async function removeLineManager() {
//   console.log("Connecting to database...");
//   await connectDB(process.env.DB_URI);
//   console.log("Database connected successfully");

//   const employee = await Employee.findById(employeeId);

//   if (!employee) {
//     console.error(`Employee with ID ${employeeId} not found`);
//     mongoose.connection.close();
//     return;
//   }

//   employee.lineManager = null;
//   await employee.save();

//   console.log(`Removed line manager for employee ${employee._id}`);
//   mongoose.connection.close();
// }

// // Example usage
// removeLineManager().catch((err) => {
//   console.error("Error:", err);
//   mongoose.connection.close();
// });

// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import connectDB from "../config/connectDB.js";
// import Employee from "../v1/models/employee.model.js";
// import { LeaveHistory } from "../v1/models/leave.model.js";

// dotenv.config();

// const leaveHistoryId = "688a1959f67cc18b7fc73f42";

// async function setLeaveHistoryLineManager() {
//   console.log("Connecting to database...");
//   await connectDB(process.env.DB_URI);
//   console.log("Database connected successfully");

//   // Fetch the leaveHistory and populate the employee
//   const leaveHistory = await LeaveHistory.findById(leaveHistoryId).populate(
//     "employee"
//   );

//   if (!leaveHistory) {
//     console.error(`LeaveHistory with ID ${leaveHistoryId} not found`);
//     mongoose.connection.close();
//     return;
//   }

//   if (!leaveHistory.employee) {
//     console.error(`LeaveHistory ${leaveHistoryId} has no linked employee`);
//     mongoose.connection.close();
//     return;
//   }

//   // Get the employee's line manager
//   const employee = await Employee.findById(leaveHistory.employee._id);

//   if (!employee) {
//     console.error(`Employee ${leaveHistory.employee._id} not found`);
//     mongoose.connection.close();
//     return;
//   }

//   if (!employee.lineManager) {
//     console.warn(`Employee ${employee._id} has no line manager`);
//     mongoose.connection.close();
//     return;
//   }

//   // Set the leaveHistory's lineManager
//   leaveHistory.lineManager = employee.lineManager;
//   await leaveHistory.save();

//   console.log(
//     `Updated leaveHistory ${leaveHistoryId} with lineManager ${employee.lineManager}`
//   );

//   mongoose.connection.close();
// }

// // Example usage
// setLeaveHistoryLineManager().catch((err) => {
//   console.error("Error:", err);
//   mongoose.connection.close();
// });


import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/connectDB.js";
import Employee from "../v1/models/employee.model.js";

dotenv.config();

const employeeId = "681b5abe391b74f15c048906";

async function removeReliever() {
  console.log("Connecting to database...");
  await connectDB(process.env.DB_URI);
  console.log("Database connected successfully");

  const employee = await Employee.findById(employeeId);

  if (!employee) {
    console.error(`Employee with ID ${employeeId} not found`);
    mongoose.connection.close();
    return;
  }

  employee.reliever = null;
  await employee.save();

  console.log(`Removed reliever for employee ${employee._id}`);
  mongoose.connection.close();
}

// Example usage
removeReliever().catch((err) => {
  console.error("Error:", err);
  mongoose.connection.close();
});
