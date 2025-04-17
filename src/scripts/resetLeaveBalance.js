import cron from "node-cron";
import { EmployeeLeaveBalance, LeaveType } from "../v1/models/leave.model";

// Schedule a job to run at midnight on January 1st every year
cron.schedule("0 0 1 1 *", async () => {
  console.log("Running annual leave balance reset job...");
  resetLeaveBalances();
});

export async function resetLeaveBalances() {
  try {
    // Fetch all leave balances
    const leaveBalances = await EmployeeLeaveBalance.find();

    // Loop through each balance and reset it
    for (const balance of leaveBalances) {
      // Fetch the corresponding leave type
      const leaveType = await LeaveType.findById(balance.leaveTypeId);

      if (leaveType) {
        // Reset balance to the default balance of the leave type
        balance.balance = leaveType.defaultBalance;
        await balance.save();
      }
    }

    console.log("Leave balances successfully reset for the new year.");
  } catch (error) {
    console.error("Error resetting leave balances:", error);
  }
}
