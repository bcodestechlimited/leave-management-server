import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

import Employee from "../v1/models/employee.model.js";
import connectDB from "../config/connectDB.js";
import { hashPassword } from "../utils/validationUtils.js";
import {
  EmployeeLeaveBalance,
  LeaveHistory,
} from "../v1/models/leave.model.js";

// Tenant Id: 6800a6704cc8c7225a28c870

// Fetch all candidates
async function fixLeaveHistories() {
  console.log("Connecting to database...");
  await connectDB(process.env.DB_URI);
  console.log("Database connected successfully");

  console.log("Fixing leaveHistories...");

  const leaveHistories = await LeaveHistory.find({
    tenantId: "6800a6704cc8c7225a28c870",
    status: "pending",
  }).populate([
    {
      path: "employee",
    },
    {
      path: "leaveType",
    },
  ]);

  leaveHistories.map(async (leaveHistory, index) => {
    console.log(
      `Processing leave history ${index + 1} of ${leaveHistories.length}`
    );

    const employeeLeaveBalance = await EmployeeLeaveBalance.findOne({
      tenantId: "6800a6704cc8c7225a28c870",
      employeeId: leaveHistory.employee._id,
      leaveTypeId: leaveHistory.leaveType._id,
    });

    // Update the leaveTypeId in the leave history
    leaveHistory.leaveSummary.balanceBeforeLeave =
      leaveHistory.leaveType.defaultBalance;

    leaveHistory.leaveSummary.balanceAfterLeave =
      leaveHistory.leaveType.defaultBalance - leaveHistory.duration;

    leaveHistory.leaveSummary.remainingDays =
      leaveHistory.leaveType.defaultBalance - leaveHistory.duration;

    await leaveHistory.save();

    console.log(
      `Updated leave history for employee ${leaveHistory.employee._id} with leave type ${leaveHistory.leaveType._id}`
    );
  });

  const employeeLeaveBalance = await EmployeeLeaveBalance.find({
    tenantId: "6800a6704cc8c7225a28c870",
    employeeId: leaveHistories[0].employee._id,
  });

  console.log({ leaveHistories: leaveHistories[0] });
  console.log({ leaveType: leaveHistories[0].leaveType });
  console.log({ employeeLeaveBalance: employeeLeaveBalance[0] });
}

fixLeaveHistories();
