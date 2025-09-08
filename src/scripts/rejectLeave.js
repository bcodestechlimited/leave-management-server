import dotenv from "dotenv";
import connectDB from "../config/connectDB.js";
import {
  EmployeeLeaveBalance,
  LeaveHistory,
} from "../v1/models/leave.model.js";
import Employee from "../v1/models/employee.model.js";
import { LeaveType } from "../v1/models/leave.model.js";
import mongoose from "mongoose";

dotenv.config();

const leaveHistoryId = "68b0947f046413ae02644060";
const tenantId = "6800a6704cc8c7225a28c870";
// 681b5ac5391b74f15c048ab6
/**
 * Reject a leave request and restore the employee's leave balance.
 * @param {string} tenantId - The tenant ID
 * @param {string} leaveHistoryId - The ID of the leave history record to reject
 */
async function rejectLeaveAndRestoreBalance(tenantId, leaveHistoryId) {
  console.log("Connecting to database...");
  await connectDB(process.env.DB_URI);
  console.log("Database connected successfully");

  console.log(
    `Rejecting leave request ${leaveHistoryId} for tenant ${tenantId}...`
  );

  // Find the leave request
  const leaveHistory = await LeaveHistory.findOne({
    _id: leaveHistoryId,
    tenantId,
  }).populate([{ path: "employee" }, { path: "leaveType" }]);

  if (!leaveHistory) {
    console.warn(`Leave request ${leaveHistoryId} not found`);
    return;
  }

  if (leaveHistory.status !== "pending") {
    console.warn(
      `Leave request ${leaveHistoryId} cannot be rejected because it is already ${leaveHistory.status}`
    );
    return;
  }

//   console.log({ leaveHistory });
//   mongoose.connection.close();
//   return;

  // Update status to rejected
  leaveHistory.status = "rejected";
  leaveHistory.reliever = leaveHistory.employee.reliever;

  // Restore the leave balance
  const leaveBalance = await EmployeeLeaveBalance.findOne({
    tenantId,
    employeeId: leaveHistory.employee._id,
    leaveTypeId: leaveHistory.leaveType._id,
  });

  if (leaveBalance) {
    leaveBalance.balance += leaveHistory.duration;
    await leaveBalance.save();
    await leaveHistory.save();

    console.log(
      `Leave request ${leaveHistoryId} rejected. Restored ${leaveHistory.duration} days to employee ${leaveHistory.employee._id}`
    );

    mongoose.connection.close();
  } else {
    console.warn(
      `No leave balance record found for employee ${leaveHistory.employee._id} and leave type ${leaveHistory.leaveType._id}`
    );
    mongoose.connection.close();
  }
}

// Example usage
rejectLeaveAndRestoreBalance(tenantId, leaveHistoryId).catch((err) => {
  console.error("Error:", err);
  mongoose.connection.close();
});
