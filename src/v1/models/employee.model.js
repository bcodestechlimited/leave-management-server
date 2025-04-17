import mongoose from "mongoose";
import Level from "./level.model.js";
import { EmployeeLeaveBalance } from "./leave.model.js";
const { Schema } = mongoose;

const employeeSchema = new Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    staffId: {
      type: String,
      default: "",
    },
    firstname: {
      type: String,
    },
    middlename: {
      type: String,
    },
    surname: {
      type: String,
    },
    name: {
      type: String,
    },
    username: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/demmgc49v/image/upload/v1695969739/default-avatar_scnpps.jpg",
    },
    jobRole: {
      type: String,
    },
    documents: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        url: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          enum: ["image", "document"],
          required: true,
        },
      },
    ],
    isOnLeave: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lineManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reliever: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    levelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Level",
      default: null,
    },
    atsInfo: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

employeeSchema.methods.getLeaveBalances = async function (
  employeeId,
  tenantId
) {
  try {
    return EmployeeLeaveBalance.aggregate([
      {
        $match: {
          employeeId: mongoose.Types.ObjectId.createFromHexString(employeeId),
          tenantId: mongoose.Types.ObjectId.createFromHexString(tenantId),
        },
      },
      {
        $lookup: {
          from: "leavetypes",
          localField: "leaveTypeId",
          foreignField: "_id",
          as: "leaveTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$leaveTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          leaveTypeId: 1,
          balance: 1,
          "leaveTypeDetails.name": 1,
          "leaveTypeDetails.defaultBalance": 1,
        },
      },
    ]);
  } catch (error) {
    throw error;
  }
};

// Runs Only when level changes
employeeSchema.pre("save", async function (next) {
  if (!this.isModified("levelId") || !this.levelId) return next();

  try {
    await updateLeaveBalances(this);
    next();
  } catch (error) {
    console.error("Error in pre-save leave balance update:", error);
    next(error);
  }
});

// Runs Only when level changes through findOneAndUpdate
employeeSchema.pre("findOneAndUpdate", async function (next) {
  // if (!this.isModified("levelId") || !this.levelId) return next();
  const update = this.getUpdate();
  if (!update || !update.levelId) return next();

  try {
    const employee = await this.model.findOne(this.getQuery());

    if (
      employee &&
      employee?.levelId != null &&
      employee?.levelId?.toString() !== update.levelId.toString()
    ) {
      await updateLeaveBalances(employee, update.levelId.toString());
    }
    next();
  } catch (error) {
    console.error("Error in pre-findOneAndUpdate leave balance update:", error);
    next(error);
  }
});

// Function to update leave balances for an employee
async function updateLeaveBalances(employee, newLevelId = employee.levelId) {
  const newLevel = await Level.findById(newLevelId).populate("leaveTypes");
  if (!newLevel) {
    throw new Error("Invalid levelId");
  }

  const newLevelLeaves = newLevel.leaveTypes || [];

  // Remove old balances for the employee
  await EmployeeLeaveBalance.deleteMany({ employeeId: employee._id });

  // Insert new leave balances
  const newLeaveBalances = newLevelLeaves.map((leave) => ({
    tenantId: employee.tenantId,
    employeeId: employee._id,
    leaveTypeId: leave._id,
    balance: leave.defaultBalance,
  }));

  await EmployeeLeaveBalance.insertMany(newLeaveBalances);
}

employeeSchema.statics.getEmployeeStats = async function () {
  try {
    const result = await this.aggregate([
      {
        $facet: {
          employeeStats: [
            {
              $group: {
                _id: "$levelId",
                count: { $sum: 1 },
              },
            },
          ],
          levels: [
            { $match: { $expr: { $ne: ["$levelId", null] } } },
            {
              $lookup: {
                from: "levels",
                localField: "levelId",
                foreignField: "_id",
                as: "levelInfo",
              },
            },
            { $unwind: "$levelInfo" },
            {
              $group: {
                _id: "$levelInfo._id",
                name: { $first: "$levelInfo.name" },
              },
            },
          ],
        },
      },
      {
        $project: {
          byLevel: {
            $map: {
              input: "$levels",
              as: "level",
              in: {
                levelId: "$$level._id",
                levelName: "$$level.name",
                totalEmployees: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        "$employeeStats.count",
                        {
                          $indexOfArray: ["$employeeStats._id", "$$level._id"],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          },
          totalEmployees: { $sum: "$employeeStats.count" },
        },
      },
    ]);

    // const result = await this.aggregate([
    //   {
    //     $match: { levelId: { $ne: null } }, // Exclude null levelIds
    //   },
    //   {
    //     $group: {
    //       _id: "$levelId",
    //       count: { $sum: 1 },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "levels", // The name of the Level collection
    //       localField: "_id", // The _id from the previous $group stage (levelId)
    //       foreignField: "_id", // The _id field in the Level collection
    //       as: "levelInfo", // The name of the array field to store the populated data
    //     },
    //   },
    //   // {
    //   //   $unwind: "$levelInfo", // Flatten the array to get levelInfo as an object
    //   // },
    //   // {
    //   //   $project: {
    //   //     _id: 0, // Exclude the default _id field
    //   //     levelId: "$_id", // Include the levelId from the grouping stage
    //   //     count: 1, // Include the count
    //   //     levelName: "$levelInfo.name", // Include the name of the level
    //   //   },
    //   // },
    // ]);

    return result[0] || { byLevel: [], totalEmployees: 0 };
  } catch (error) {
    console.error("Error in getEmployeeStats:", error);
    throw error;
  }
};
export default mongoose.model("Employee", employeeSchema);
