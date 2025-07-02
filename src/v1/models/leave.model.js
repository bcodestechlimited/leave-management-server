import mongoose from "mongoose";

// Define the LeaveType schema
const leaveTypeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    name: {
      type: String,
      required: true,
      lowercase: true,
    },
    levelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Level",
      required: true,
    },
    defaultBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Define the EmployeeLeaveBalance schema
const employeeLeaveBalanceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    balance: { type: Number, required: true },
  },
  { timestamps: true }
);

// Define the LeaveHistory schema
const leaveHistorySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    lineManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    resumptionDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reason: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    approvalReason: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    approvalCount: {
      type: Number,
      default: 0,
    },
    balanceBeforeLeave: {
      type: Number,
      default: 0,
    },
    remainingDays: {
      type: Number,
      default: 0,
    },
    document: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Static method to generate chart data
leaveHistorySchema.statics.generateChartData = async function (tenantId, year) {
  console.log({
    tenantId,
    year,
  });

  let matchStage = {
    $match: { tenantId: new mongoose.Types.ObjectId(tenantId) },
  };

  if (year) {
    matchStage = {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        startDate: {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
    };
  }

  const leaveData = await this.aggregate([
    matchStage,
    {
      $group: {
        _id: { month: { $month: "$startDate" } },
        totalLeaveRequests: { $sum: 1 },
        approvedRequests: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
        },
        rejectedRequests: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
        },
        pendingRequests: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  // Convert month numbers to month names
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const result = monthNames.map((month, index) => {
    const data = leaveData.find((item) => item._id.month === index + 1);
    return {
      month,
      totalLeaveRequests: data?.totalLeaveRequests || 0,
      approvedRequests: data?.approvedRequests || 0,
      rejectedRequests: data?.rejectedRequests || 0,
      pendingRequests: data?.pendingRequests || 0,
    };
  });

  // console.log({ result, leaveData });

  return result;
};

// Create and export the models
const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);
const EmployeeLeaveBalance = mongoose.model(
  "EmployeeLeaveBalance",
  employeeLeaveBalanceSchema
);
const LeaveHistory = mongoose.model("LeaveHistory", leaveHistorySchema);

export { LeaveType, EmployeeLeaveBalance, LeaveHistory };
