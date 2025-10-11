import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/connectDB.js";

// Add models with tenantId below
import Tenant from "../v1/models/tenant.model.js";
import Employee from "../v1/models/employee.model.js";
import {
  EmployeeLeaveBalance,
  LeaveType,
  LeaveHistory,
} from "../v1/models/leave.model.js";
import Link from "../v1/models/link.model.js";

const demoTenantId = "6881cd6c0259afaf0ad54b85";

async function deleteDemoClientData() {
  console.log("Connecting to database...");
  await connectDB(process.env.DB_URI);
  console.log("Database connected.");

  try {
    const collectionsToPurge = [
      { model: Employee, name: "Employee" },
      { model: LeaveHistory, name: "LeaveHistory" },
      { model: EmployeeLeaveBalance, name: "EmployeeLeaveBalance" },
      { model: LeaveType, name: "LeaveType" },
      { model: Link, name: "Link" },
      // Add more collections as needed
    ];

    for (const { model, name } of collectionsToPurge) {
      const records = await model.find({ tenantId: demoTenantId });
      if (records.length === 0) {
        console.log(`No ${name} records found for tenant.`);
        continue;
      }

      for (const record of records) {
        await model.deleteOne({ _id: record._id });
        console.log(`${name} ${record._id} deleted.`);
      }
    }

    // Finally, delete the tenant
    const deletedTenant = await Tenant.findOneAndDelete({ _id: demoTenantId });

    if (deletedTenant) {
      console.log(`Tenant ${demoTenantId} deleted successfully.`);
    } else {
      console.warn(`Tenant ${demoTenantId} not found.`);
    }

    console.log("All demo client data removed.");
  } catch (error) {
    console.error("Error removing demo client data:", {
      message: error.message,
      stack: error.stack,
    });
  }
}

deleteDemoClientData();
