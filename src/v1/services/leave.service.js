import {
  LeaveHistory,
  EmployeeLeaveBalance,
  LeaveType,
} from "../models/leave.model.js";
import ApiError from "../../utils/apiError.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import { paginate } from "../../utils/paginate.js";
import Employee from "../models/employee.model.js";
import levelService from "./level.service.js";
import mongoose from "mongoose";
import emailUtils from "../../utils/emailUtils.js";
import frontendURLs from "../../utils/frontendURLs.js";
import ExcelJS from "exceljs";
import { uploadToCloudinary } from "./upload.service.js";

//Request For Leave
async function requestLeave(leaveData = {}, employeeId, tenantId, document) {
  const { leaveTypeId, startDate, resumptionDate, duration, reason } =
    leaveData;

  // Validate leave balance
  let leaveBalance = await EmployeeLeaveBalance.findOne({
    employeeId,
    leaveTypeId,
  });

  if (!leaveBalance) {
    const leaveType = await LeaveType.findById(leaveTypeId);

    if (!leaveType) {
      throw ApiError.badRequest("No leave with the leaveTypeId");
    }

    leaveBalance = await EmployeeLeaveBalance.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      balance: leaveType.defaultBalance,
      tenantId,
    });
  }

  if (!leaveBalance || leaveBalance.balance < duration) {
    throw ApiError.badRequest("Insufficient leave balance.");
  }

  const employee = await Employee.findById(employeeId).populate([
    {
      path: "tenantId",
    },
    {
      path: "lineManager",
      select: [
        "name",
        "firstname",
        "middlename",
        "surname",
        "email",
        "isOnLeave",
        "reliever",
      ],
    },
    {
      path: "reliever",
      select: [
        "name",
        "firstname",
        "middlename",
        "surname",
        "email",
        "isOnLeave",
      ],
    },
  ]);

  if (!employee.lineManager || employee.lineManager === null) {
    throw ApiError.badRequest("Please update your line manager");
  }

  if (!employee.reliever || employee.reliever === null) {
    throw ApiError.badRequest("Please update your reliever");
  }

  if (employee.isOnLeave) {
    throw ApiError.badRequest("You are already on leave");
  }

  if (employee?.reliever?.isOnLeave) {
    throw ApiError.badRequest("Your reliever is on leave");
  }

  if (employee?.lineManager?.isOnLeave) {
    throw ApiError.badRequest("Your line manager is on leave");
  }

  let lineManagerId = employee.lineManager._id;
  let relieverId = employee.reliever._id;

  let documentUrl = "";

  //Upload image to cloudinary
  if (document) {
    documentUrl = await uploadToCloudinary(document.tempFilePath);
  }

  const pendingRequest = await LeaveHistory.findOne({
    employee: employeeId,
    status: "pending",
  });

  if (pendingRequest) {
    throw ApiError.badRequest(
      "You already have a pending leave request, please wait for that request to be approved."
    );
  }

  // Create leave request
  const leaveRequest = new LeaveHistory({
    tenantId,
    employee: employeeId,
    lineManager: lineManagerId,
    reliever: relieverId,
    leaveType: leaveTypeId,
    startDate,
    resumptionDate,
    duration,
    reason,
    document: documentUrl,
    status: "pending",
    leaveSummary: {
      balanceBeforeLeave: leaveBalance.balance,
      balanceAfterLeave: leaveBalance.balance - duration,
      remainingDays: leaveBalance.balance - duration,
    },
  });

  leaveBalance.balance = leaveBalance.balance - duration;
  employee.isOnLeave = true;

  await leaveRequest.save();
  await leaveBalance.save();
  await leaveRequest.populate([
    {
      path: "lineManager",
      select: ["name", "firstname", "middlename", "surname", "email"],
    },
    {
      path: "employee",
      select: ["name", "firstname", "middlename", "surname", "email"],
    },
  ]);

  // Send mail to the line manager
  const emailObject = createEmailObject(leaveRequest, employee);

  try {
    await emailUtils.sendLeaveRequestEmail(emailObject);
    await emailUtils.sendLeaveRequestEmailToReliever(emailObject);
  } catch (error) {
    console.log(error);
  }

  return ApiSuccess.created(
    "Leave request submitted successfully",
    leaveRequest
  );
}

// Retrieve All Leave Request
async function getLeaveRequests(query = {}, tenantId) {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    sort = { createdAt: -1 },
    employee,
    lineManager,
  } = query;

  // --- Base match (tenant + optional employee/manager filter) ---
  const baseMatch = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
  };

  if (employee) {
    baseMatch.employee = new mongoose.Types.ObjectId(employee);
  }

  if (lineManager) {
    baseMatch.lineManager = new mongoose.Types.ObjectId(lineManager);
  }

  if (status && status.toLowerCase() !== "all") {
    baseMatch.status = status;
  }

  // --- Count total before any search ---
  const totalCount = await LeaveHistory.countDocuments(baseMatch);

  // --- Build aggregation pipeline ---
  const pipeline = [
    { $match: baseMatch },

    // lookup employee
    {
      $lookup: {
        from: "employees",
        localField: "employee",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },

    // lookup lineManager
    {
      $lookup: {
        from: "employees",
        localField: "lineManager",
        foreignField: "_id",
        as: "lineManager",
      },
    },
    { $unwind: "$lineManager" },
  ];

  let searchTokens = [];
  if (search) {
    searchTokens = search.split(" ").filter(Boolean); // ["david", "smith"]
  }

  if (searchTokens.length > 0) {
    const tokenRegexConditions = searchTokens.map((token) => ({
      $or: [
        { description: { $regex: token, $options: "i" } },
        { status: { $regex: token, $options: "i" } },
        { "employee.firstname": { $regex: token, $options: "i" } },
        { "employee.middlename": { $regex: token, $options: "i" } },
        { "employee.surname": { $regex: token, $options: "i" } },
        { "lineManager.firstname": { $regex: token, $options: "i" } },
        { "lineManager.middlename": { $regex: token, $options: "i" } },
        { "lineManager.surname": { $regex: token, $options: "i" } },
      ],
    }));

    pipeline.push({
      $match: { $and: tokenRegexConditions },
    });
  }

  // --- Count filtered results ---
  const countPipeline = [...pipeline, { $count: "count" }];
  const countResult = await LeaveHistory.aggregate(countPipeline);
  const filteredCount = countResult.length > 0 ? countResult[0].count : 0;

  // --- Sorting & Pagination ---
  pipeline.push({ $sort: sort });
  pipeline.push({ $skip: (page - 1) * limit });
  pipeline.push({ $limit: Number(limit) || 10 });

  // --- Execute final query ---
  const leaveRequests = await LeaveHistory.aggregate(pipeline);

  console.log({ totalCount, filteredCount });

  return ApiSuccess.ok("Leave requests retrieved successfully", {
    leaveRequests,
    pagination: {
      totalCount,
      filteredCount,
      totalPages: Math.ceil(filteredCount / limit),
      page,
      limit,
    },
  });
}
async function getLeaveRequestsBySuperAdmin(query = {}) {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    sort = { createdAt: -1 },
    employee,
    lineManager,
    tenantId,
  } = query;

  // --- Base match (tenant + optional employee/manager filter) ---
  const baseMatch = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
  };

  if (employee) {
    baseMatch.employee = new mongoose.Types.ObjectId(employee);
  }

  if (lineManager) {
    baseMatch.lineManager = new mongoose.Types.ObjectId(lineManager);
  }

  if (status && status.toLowerCase() !== "all") {
    baseMatch.status = status;
  }

  // --- Count total before any search ---
  const totalCount = await LeaveHistory.countDocuments(baseMatch);

  // --- Build aggregation pipeline ---
  const pipeline = [
    { $match: baseMatch },

    // lookup employee
    {
      $lookup: {
        from: "employees",
        localField: "employee",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },

    // lookup lineManager
    {
      $lookup: {
        from: "employees",
        localField: "lineManager",
        foreignField: "_id",
        as: "lineManager",
      },
    },
    { $unwind: "$lineManager" },
  ];

  let searchTokens = [];
  if (search) {
    searchTokens = search.split(" ").filter(Boolean); // ["david", "smith"]
  }

  if (searchTokens.length > 0) {
    const tokenRegexConditions = searchTokens.map((token) => ({
      $or: [
        { description: { $regex: token, $options: "i" } },
        { status: { $regex: token, $options: "i" } },
        { "employee.firstname": { $regex: token, $options: "i" } },
        { "employee.middlename": { $regex: token, $options: "i" } },
        { "employee.surname": { $regex: token, $options: "i" } },
        { "lineManager.firstname": { $regex: token, $options: "i" } },
        { "lineManager.middlename": { $regex: token, $options: "i" } },
        { "lineManager.surname": { $regex: token, $options: "i" } },
      ],
    }));

    pipeline.push({
      $match: { $and: tokenRegexConditions },
    });
  }

  // --- Count filtered results ---
  const countPipeline = [...pipeline, { $count: "count" }];
  const countResult = await LeaveHistory.aggregate(countPipeline);
  const filteredCount = countResult.length > 0 ? countResult[0].count : 0;

  // --- Sorting & Pagination ---
  pipeline.push({ $sort: sort });
  pipeline.push({ $skip: (page - 1) * limit });
  pipeline.push({ $limit: Number(limit) || 10 });

  // --- Execute final query ---
  const leaveRequests = await LeaveHistory.aggregate(pipeline);

  console.log({ totalCount, filteredCount });

  return ApiSuccess.ok("Leave requests retrieved successfully", {
    leaveRequests,
    pagination: {
      totalCount,
      filteredCount,
      totalPages: Math.ceil(filteredCount / limit),
      page,
      limit,
    },
  });
}

// Retrieve One Leave Request
async function getSingleLeaveRequest(leaveId, tenantId) {
  if (!leaveId) {
    throw ApiError.badRequest("LeaveId not provided.");
  }

  const populateOptions = [
    {
      path: "employee",
    },
    {
      path: "leaveType",
      select: "name",
    },
    {
      path: "lineManager",
    },
  ];

  const leaveRequest = await LeaveHistory.findOne({
    _id: leaveId,
    tenantId,
  }).populate(populateOptions);

  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  return ApiSuccess.ok("Leave request retrieved successfully", leaveRequest);
}

async function updateLeaveRequest(
  leaveId,
  leaveRequestData,
  employeeId,
  tenantId
) {
  const { status, reason } = leaveRequestData;

  // Find the leave request
  const leaveRequest = await LeaveHistory.findOne({
    _id: leaveId,
    tenantId,
  }).populate({ path: "employee" });

  // Needed for  while since reliever is now on the leaveRequest
  leaveRequest.reliever = leaveRequest.employee.reliever;

  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  // Check if the person trying to update the leave request is the lineManager or an HR admin
  const employee = await Employee.findById(employeeId).populate([
    {
      path: "lineManager",
    },
    {
      path: "tenantId",
    },
  ]);

  if (
    employee._id.toString() !== leaveRequest.lineManager.toString() &&
    !employee.isAdmin
  ) {
    throw ApiError.badRequest("You can't update this leave request");
  }

  // Update leave request status

  // If rejected, add leave balance back
  if (status === "rejected") {
    leaveRequest.status = status;
    const leaveBalance = await EmployeeLeaveBalance.findOne({
      employeeId: leaveRequest.employee,
      tenantId: tenantId,
    });

    leaveBalance.balance += leaveRequest.duration;
    leaveRequest.rejectionReason = reason;
    leaveRequest.rejectedBy = leaveRequest.lineManager._id;
    await leaveBalance.save();

    try {
      const emailObject = createEmailObject(leaveRequest, employee);
      await emailUtils.sendLeaveRejectionEmail(emailObject);
    } catch (error) {
      console.error("Failed to send leave rejection email:", error);
    }
  }

  if (status === "approved") {
    leaveRequest.approvalReason = reason;
    leaveRequest.approvedBy = leaveRequest.lineManager._id;
    leaveRequest.approvalCount = leaveRequest.approvalCount + 1;
    // const leaveEmployee = await Employee.findById(leaveRequest.employee._id);
    // leaveEmployee.isOnLeave = true;
    // await leaveEmployee.save();

    try {
      const emailObject = createEmailObject(leaveRequest, employee);
      // send to client admin first
      await emailUtils.sendClientLeaveRequestEmail(emailObject);
    } catch (error) {
      console.error(
        "Failed to send first approval email to client admin:",
        error
      );
    }
  }

  await leaveRequest.save();
  return ApiSuccess.ok(
    "Leave request status updated successfully",
    leaveRequest
  );
}
async function updateLeaveRequestBySuperAdmin(
  leaveId,
  leaveRequestData,
  tenantId
) {
  const { status, reason } = leaveRequestData;

  // Find the leave request
  const leaveRequest = await LeaveHistory.findOne({
    _id: leaveId,
    tenantId,
  }).populate({ path: "employee" });

  // Needed for  while since reliever is now on the leaveRequest
  leaveRequest.reliever = leaveRequest.employee.reliever;

  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  if (leaveRequest.approvalCount <= 0) {
    throw ApiError.badRequest(
      "This leave request has not been approved by the employee's line manager yet"
    );
  }

  // Check if the person trying to update the leave request is the lineManager or an HR admin
  const employee = await Employee.findById(leaveRequest.employee).populate([
    {
      path: "lineManager",
    },
    {
      path: "tenantId",
    },
  ]);

  leaveRequest.status = status;

  // If rejected, add leave balance back
  if (status === "rejected") {
    const leaveBalance = await EmployeeLeaveBalance.findOne({
      employeeId: leaveRequest.employee,
      tenantId: tenantId,
    });

    leaveBalance.balance += leaveRequest.duration;
    leaveRequest.rejectionReason = reason;
    leaveRequest.rejectedBy = leaveRequest.lineManager._id;
    await leaveBalance.save();

    try {
      const emailObject = createEmailObject(leaveRequest, employee);
      await emailUtils.sendClientLeaveRejectionEmail(emailObject);
    } catch (error) {
      console.error("Failed to send leave rejection email:", error);
    }
  }

  if (status === "approved") {
    leaveRequest.approvalReason = reason;
    leaveRequest.approvedBy = leaveRequest.lineManager._id;
    leaveRequest.approvalCount = 2;
    // const leaveEmployee = await Employee.findById(leaveRequest.employee._id);
    // leaveEmployee.isOnLeave = true;
    // await leaveEmployee.save();
    const leaveBalance = await EmployeeLeaveBalance.findOne({
      employeeId: leaveRequest.employee,
      tenantId: tenantId,
    });

    leaveRequest.remainingDays = leaveBalance.balance;
    leaveRequest.balanceBeforeLeave =
      leaveBalance.balance + leaveRequest.duration;

    try {
      const emailObject = createEmailObject(leaveRequest, employee);
      await emailUtils.sendLeaveApprovalEmail(emailObject);
      await emailUtils.sendLeaveApprovalEmailToLineManager(emailObject);
    } catch (error) {
      console.error(
        "Failed to send second approval email to client admin:",
        error
      );
    }
  }

  await leaveRequest.save();
  return ApiSuccess.ok(
    "Leave request status updated successfully",
    leaveRequest
  );
}
async function updateLeaveRequestByClientAdmin(
  leaveId,
  leaveRequestData,
  tenantId
) {
  const { status, reason } = leaveRequestData;

  // Find the leave request
  const leaveRequest = await LeaveHistory.findOne({
    _id: leaveId,
    tenantId,
  }).populate({ path: "employee" });

  // Needed for  while since reliever is now on the leaveRequest
  leaveRequest.reliever = leaveRequest.employee.reliever;

  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  if (leaveRequest.approvalCount <= 0) {
    throw ApiError.badRequest(
      "This leave request has not been approved by the employee's line manager yet"
    );
  }

  // Check if the person trying to update the leave request is the lineManager or an HR admin
  const employee = await Employee.findById(leaveRequest.employee).populate([
    {
      path: "lineManager",
    },
    {
      path: "tenantId",
    },
  ]);

  leaveRequest.status = status;

  // If rejected, add leave balance back
  if (status === "rejected") {
    const leaveBalance = await EmployeeLeaveBalance.findOne({
      employeeId: leaveRequest.employee,
      tenantId: tenantId,
    });

    leaveBalance.balance += leaveRequest.duration;
    leaveRequest.rejectionReason = reason;
    leaveRequest.rejectedBy = leaveRequest.lineManager._id;
    await leaveBalance.save();

    try {
      const emailObject = createEmailObject(leaveRequest, employee);
      await emailUtils.sendClientLeaveRejectionEmail(emailObject);
    } catch (error) {
      console.error("Failed to send leave rejection email:", error);
    }
  }

  if (status === "approved") {
    leaveRequest.approvalReason = reason;
    leaveRequest.approvedBy = leaveRequest.lineManager._id;
    leaveRequest.approvalCount = leaveRequest.approvalCount + 1;
    // const leaveEmployee = await Employee.findById(leaveRequest.employee._id);
    // leaveEmployee.isOnLeave = true;
    // await leaveEmployee.save();
    const leaveBalance = await EmployeeLeaveBalance.findOne({
      employeeId: leaveRequest.employee,
      tenantId: tenantId,
    });

    leaveRequest.remainingDays = leaveBalance.balance;
    leaveRequest.balanceBeforeLeave =
      leaveBalance.balance + leaveRequest.duration;

    try {
      const emailObject = createEmailObject(leaveRequest, employee);
      await emailUtils.sendLeaveApprovalEmail(emailObject);
      await emailUtils.sendLeaveApprovalEmailToLineManager(emailObject);
    } catch (error) {
      console.error(
        "Failed to send second approval email to client admin:",
        error
      );
    }
  }

  await leaveRequest.save();
  return ApiSuccess.ok(
    "Leave request status updated successfully",
    leaveRequest
  );
}

async function deleteLeaveRequest(leaveId, tenantId) {
  if (!leaveId) {
    throw ApiError.badRequest("LeaveId not provided.");
  }

  const leaveRequest = await LeaveHistory.findOneAndDelete({
    _id: leaveId,
    tenantId,
  });

  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  return ApiSuccess.ok("Leave request deleted successfully", leaveRequest);
}

// -- LeaveType ------------------------------------------

// Add LeaveType
async function addLeaveType(leaveTypeData = {}, tenantId) {
  const { name, defaultBalance, levelId } = leaveTypeData;

  // Check if the leave type already exists in the level by name using aggregation
  // Use lean() for faster queries, returning plain objects
  const levelWithLeaveType = await levelService.getLevelById(
    levelId,
    tenantId,
    true,
    [{ path: "leaveTypes", select: "name" }]
  );

  // Check if the leave type name already exists in the level's leaveTypes array
  const leaveTypeExistsInLevel = levelWithLeaveType.leaveTypes.some(
    (leaveType) => leaveType.name === name.toLowerCase()
  );

  if (leaveTypeExistsInLevel) {
    throw ApiError.badRequest(
      "A leave type with this name already exists in this level."
    );
  }

  // Create a new leave type
  const leaveType = new LeaveType({ name, defaultBalance, tenantId, levelId });
  await leaveType.save();

  // Atomically update the level with the new leave type, using $push for atomicity
  await levelService.updateLevel(
    levelId,
    {
      $push: { leaveTypes: leaveType },
    },
    tenantId
  );

  // Find all employees under this level
  const employees = await Employee.find({ levelId, tenantId }).lean();

  // Add the leave type with the default balance to all employees in EmployeeLeaveBalance
  const employeeLeaveBalances = employees.map((employee) => ({
    tenantId,
    employeeId: employee._id,
    leaveTypeId: leaveType._id,
    balance: defaultBalance,
  }));

  // Use bulk insert to add leave balances for all employees
  await EmployeeLeaveBalance.insertMany(employeeLeaveBalances);

  return ApiSuccess.created("Leave type added successfully", leaveType);
}

// Get Leave Types with Pagination.
async function getLeaveTypes(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const populateOptions = [
    {
      path: "levelId",
      select: "name",
    },
  ];

  const { documents: leaveTypes, pagination } = await paginate({
    model: LeaveType,
    query: filter,
    page,
    limit,
    populateOptions,
    sort,
  });

  return ApiSuccess.ok("Leave types retrieved successfully", {
    leaveTypes,
    pagination,
  });
}

// Update an existing Leave Type.
async function updateLeaveType(leaveTypeId, leaveTypeData, tenantId) {
  if (!leaveTypeId) {
    throw ApiError.badRequest("LeaveTypeId not provided.");
  }

  // Update the leave type
  const leaveType = await LeaveType.findOneAndUpdate(
    { _id: leaveTypeId, tenantId },
    { ...leaveTypeData },
    { runValidators: true, new: true }
  );

  if (!leaveType) {
    throw ApiError.badRequest(
      "No leave type found with the provided leaveTypeId."
    );
  }

  // If the default balance is updated, adjust leave balances for all employees
  if (leaveTypeData.defaultBalance !== undefined) {
    const employeesToUpdate = await EmployeeLeaveBalance.find({
      leaveTypeId,
      tenantId,
    });

    const bulkUpdates = employeesToUpdate.map((balance) => ({
      updateOne: {
        filter: { _id: balance._id },
        update: {
          $set: { balance: leaveTypeData.defaultBalance },
        },
      },
    }));

    // Perform a bulk write for efficiency
    if (bulkUpdates.length) {
      await EmployeeLeaveBalance.bulkWrite(bulkUpdates);
    }
  }

  return ApiSuccess.ok("Leave type updated successfully", leaveType);
}

// Delete a Leave Type.
async function deleteLeaveType(leaveTypeId, tenantId) {
  if (!leaveTypeId) {
    throw ApiError.badRequest("LeaveTypeId not provided.");
  }

  // Find and delete the leave type
  const leaveType = await LeaveType.findOneAndDelete({
    _id: leaveTypeId,
    tenantId,
  });
  if (!leaveType) {
    throw ApiError.badRequest(
      "No leave type found with the provided leaveTypeId."
    );
  }

  // Remove corresponding leave balances
  await EmployeeLeaveBalance.deleteMany({ leaveTypeId });

  return ApiSuccess.ok("Leave type deleted successfully", leaveType);
}

async function getLeaveBalance(employeeId, tenantId) {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    throw ApiError.badRequest("Invalid employeeId provided.");
  }

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw ApiError.badRequest("Invalid tenantId provided.");
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    tenantId,
  });

  if (!employee) {
    throw ApiError.notFound("Employee not found");
  }

  const leaveBalances = await employee.getLeaveBalances(
    String(employeeId),
    String(tenantId)
  );

  // Return empty array if no balances are found
  return ApiSuccess.ok("Leave balance retrieved successfully", {
    leaveBalance: leaveBalances.length > 0 ? leaveBalances : [],
  });
}

//Reports
async function getMonthlyLeaveReport(tenantId, query = {}) {
  const { startDate, endDate } = query;

  if (!tenantId) {
    throw ApiError.badRequest("TenantId not provided.");
  }

  const leaveRequests = await LeaveHistory.find({
    tenantId,
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    status: { $in: ["approved", "rejected"] },
  })
    .populate([
      {
        path: "employee",
        select: "staffId firstname middlename surname branch jobRole levelId",
        populate: {
          path: "reliever",
          select: "staffId firstname middlename surname branch jobRole levelId",
        },
      },
      {
        path: "lineManager",
      },
      {
        path: "reliever",
      },
      {
        path: "leaveType",
      },
    ])
    .sort({ createdAt: -1 });

  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Monthly Leave Report");

  // Define columns
  worksheet.columns = [
    { header: "S/N", key: "sn", width: 5 },
    { header: "STAFF NO", key: "staffNo", width: 15 },
    { header: "NAME", key: "name", width: 25 },
    { header: "BRANCH", key: "branch", width: 15 },
    { header: "TYPE OF LEAVE", key: "leaveType", width: 20 },
    { header: "DESIGNATION", key: "designation", width: 20 },
    { header: "START DATE", key: "startDate", width: 15 },
    { header: "END DATE", key: "endDate", width: 15 },
    { header: "RESUMPTION DATE", key: "resumptionDate", width: 18 },
    { header: "DURATION", key: "duration", width: 10 },
    { header: "REM DAYS", key: "remDays", width: 10 },
    { header: "RELIEVER", key: "reliever", width: 25 },
    { header: "REJECTION REASON", key: "rejectionReason", width: 25 },
  ];

  // Add rows
  for (const [index, leave] of leaveRequests.entries()) {
    const employee = leave.employee || {};
    const leaveType = leave.leaveType || {};

    const enddate = leave.resumptionDate
      ? new Date(leave.resumptionDate.getTime() - 1000 * 60 * 60 * 24)
          .toISOString()
          .split("T")[0]
      : "";

    let relieverDoc = leave.reliever || employee?.reliever; // prefer leave.reliever, fallback to employee.reliever
    let relieverName = "N/A";

    if (relieverDoc) {
      relieverName = `${relieverDoc.firstname || ""} ${
        relieverDoc.middlename || ""
      } ${relieverDoc.surname || ""}`.trim();
    } else {
      console.log("⚠️ Missing reliever for employee:", {
        employeeId: employee?._id,
        staffId: employee?.staffId,
        name: `${employee?.firstname || ""} ${employee?.surname || ""}`,
        leaveId: leave._id,
      });
    }

    if (employee?.reliever) {
      relieverName = `${employee.reliever.firstname || ""} ${
        employee.reliever.middlename || ""
      } ${employee.reliever.surname || ""}`;
    } else {
      relieverName = "N/A";
      console.log("⚠️ Missing reliever for employee:", {
        employeeId: employee?._id,
        staffId: employee?.staffId,
        name: `${employee?.firstname || ""} ${employee?.surname || ""}`,
        leaveId: leave._id,
      });
    }

    worksheet.addRow({
      sn: index + 1,
      staffNo: employee.staffId || "",
      name: `${employee.firstname || ""} ${employee.middlename || ""} ${
        employee.surname || ""
      }`,
      branch: employee?.branch || "",
      leaveType: leaveType?.name || "",
      designation: employee.jobRole || "",
      startDate: leave.startDate?.toISOString().split("T")[0] || "",
      endDate: enddate,
      resumptionDate: leave.resumptionDate?.toISOString().split("T")[0] || "",
      duration: leave.duration || 0,
      remDays: leave.leaveSummary.remainingDays || 0,
      reliever: relieverName,
    });
  }

  // Return file buffer (for API download or saving to disk)
  const buffer = await workbook.xlsx.writeBuffer();
  console.log({ buffer });
  return buffer;

  return ApiSuccess.ok("Leave balance retrieved successfully");
}

function createEmailObject(leaveRequest, employee) {
  return {
    lineManagerName: employee.lineManager?.firstname,
    lineManagerEmail: employee.lineManager?.email,
    employeeName: employee.firstname,
    employeeEmail: leaveRequest?.employee?.email,
    relieverName: employee.reliever?.firstname,
    relieverEmail: employee.reliever?.email,
    email: leaveRequest.lineManager?.email,
    tenantName: employee.tenantId?.name,
    tenantEmail: employee.tenantId?.email,
    color: employee.tenantId?.color,
    logo: employee.tenantId?.logo,
    startDate: leaveRequest.startDate,
    resumptionDate: leaveRequest.resumptionDate,
    leaveReason: leaveRequest.reason,
    rejectionReason: leaveRequest.rejectionReason,
    approvalReason: leaveRequest.approvalReason,
    leaveRequestUrl: frontendURLs.employee.leaveDetails(leaveRequest._id),
    clientLeaveRequestUrl: frontendURLs.tenant.leaveDetails(leaveRequest._id),
  };
}

export default {
  addLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getLeaveTypes,
  requestLeave,
  updateLeaveRequest,
  getLeaveRequests,
  getSingleLeaveRequest,
  deleteLeaveRequest,
  getLeaveBalance,
  updateLeaveRequestByClientAdmin,
  getMonthlyLeaveReport,
  // Super Admin
  getLeaveRequestsBySuperAdmin,
  updateLeaveRequestBySuperAdmin,
};
