import ApiSuccess from "../../utils/apiSuccess.js";
import Employee from "../models/employee.model.js";
import { hashPassword, validatePassword } from "../../utils/validationUtils.js";
import ApiError from "../../utils/apiError.js";
import tenantService from "./tenant.service.js";
import { generateToken, verifyToken } from "../../config/token.js";
import crypto from "crypto";
import Link from "../models/link.model.js";
import emailUtils from "../../utils/emailUtils.js";
import { paginate } from "../../utils/paginate.js";
import {
  extractAndValidateData,
  parseCSVFile,
  saveFileToUploads,
} from "../../utils/csvParserUtil.js";
import PasswordReset from "../models/passwordReset.model.js";
import { uploadToCloudinary } from "./upload.service.js";

async function signIn(employeeData = {}) {
  const { email, password } = employeeData;
  const employee = await Employee.findOne({ email }).select("+password");

  if (!employee) {
    throw ApiError.badRequest("No User with this email");
  }

  if (!employee.isEmailVerified) {
    throw ApiError.badRequest("Email has not been verified");
  }

  await validatePassword(password, employee.password);

  const token = generateToken({
    employeeId: employee._id,
    isAdmin: employee.isAdmin,
    isEmployee: true,
    roles: employee.isAdmin ? ["admin", "employee"] : ["employee"],
  });

  employee.password = undefined;

  const employeeId = String(employee._id);
  const tenantId = String(employee.tenantId);

  const leaveBalances = await employee.getLeaveBalances(employeeId, tenantId);

  return ApiSuccess.created("Login successfull", {
    employee,
    token,
    leaveBalances: leaveBalances.length > 0 ? leaveBalances : [],
  });
}

async function sendInviteToEmployee(InviteData = {}, tenantId) {
  const { email, expiresIn } = InviteData;

  const employee = await Employee.findOne({ email, tenantId });
  if (employee) {
    throw ApiError.badRequest("Employee with this email already exists");
  }

  const existingLink = await Link.findOne({ email });

  if (existingLink) {
    throw ApiError.badRequest("There is an existing link for this employee");
  }

  const { data } = await tenantService.getTenant(tenantId);
  const tenant = data?.tenant;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresIn);

  const token = crypto.randomBytes(20).toString("hex");
  const plainPassword = crypto.randomBytes(8).toString("hex"); // 8 characters
  const hashedPassword = await hashPassword(plainPassword);

  // Create a new employee
  const newEmployee = await Employee.create({
    email,
    tenantId,
    password: hashedPassword,
  });

  const inviteUrl = `${process.env.FRONTEND_URL}/${tenant._id}/verify?token=${token}`;

  // Create a new link document in the database
  const link = await Link.create({
    tenantId,
    token,
    email,
    url: inviteUrl,
    expiresAt,
    status: "pending",
  });

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: `Invite to ${tenant.name} Leave Board`,
    text: `Hello, you have been invited to join ${tenant.name} leave board. Your temporary password is: ${plainPassword}. Click on the following link to accept the invite and complete your registration: ${inviteUrl}`,
    html: `
      <p>Hello,</p>
      <p>You have been invited to join <strong>${tenant.name}</strong> leave board.</p>
      <p>Your temporary password is: <strong>${plainPassword}</strong></p>
      <p>Click on the following link to accept the invite and login in </p>
      <a href="${inviteUrl}">Go To Leave Board</a>
    `,
  };

  try {
    const emailInfo = await emailUtils.sendEmail(mailOptions);
    await Link.findByIdAndUpdate(link._id, { isDelivered: true });
  } catch {
    await Link.findByIdAndUpdate(link._id, { isDelivered: false });
  }

  return ApiSuccess.ok(`Invite Link Sent To ${email}`);
}

async function acceptInvite(token, tenantId) {
  const link = await Link.findOne({
    token,
    tenantId,
  });

  if (!link) {
    throw ApiError.notFound("Invite link not valid");
  }

  if (link.hasBeenUsed) {
    throw ApiError.notFound("This link has been used");
  }

  if (new Date() > new Date(link.expiresAt)) {
    throw ApiError.badRequest("Invite link has expired");
  }

  const employee = await Employee.findOne({
    email: link.email,
    tenantId,
  });

  if (!employee) {
    throw ApiError.notFound("Invite link not valid");
  }

  employee.isEmailVerified = true;
  link.hasBeenUsed = true;
  link.status = "accepted";
  await employee.save();
  await link.save();

  return ApiSuccess.created("Invitation Accepted", {
    employee,
  });
}

async function getEmployee(employeeId, tenantId) {
  const employee = await Employee.findOne({
    _id: employeeId,
    tenantId,
  }).populate([
    { path: "tenantId" },
    {
      path: "lineManager",
      // select: ["firstname", "lastname", "surname", "email", "isOnLeave"],
    },
    {
      path: "levelId",
      select: "name",
    },
    {
      path: "reliever",
      // select: ["firstname", "lastname", "surname", "email", "isOnLeave"],
    },
  ]);

  if (!employee) {
    throw ApiError.notFound("Employee not found");
  }

  const leaveBalances = await employee.getLeaveBalances(
    String(employeeId),
    String(tenantId)
  );

  const gender = employee.gender?.toLowerCase();
  const isMale = gender === "male";

  const filteredLeaveBalances = leaveBalances.filter((leaveBalance) => {
    const leaveTypeName = leaveBalance.leaveTypeDetails.name;
    if (isMale) {
      return !leaveTypeName.toLowerCase().includes("maternity");
    } else {
      return !leaveTypeName.toLowerCase().includes("paternity");
    }
  });

  return ApiSuccess.created("Employee Retrived Successfully  ", {
    employee,
    leaveBalances:
      filteredLeaveBalances.length > 0 ? filteredLeaveBalances : [],
  });
}

async function getEmployees(query = {}, tenantId, employeeId = null) {
  const {
    page = 1,
    limit = 10,
    search,
    sort = { createdAt: -1 },
    accountType,
  } = query;

  const filter = { tenantId };

  if (accountType) {
    filter.accountType = accountType;
  }

  if (search) {
    filter.$or = [
      { staffId: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { firstname: { $regex: search, $options: "i" } },
      { middlename: { $regex: search, $options: "i" } },
      { surname: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const populateOptions = [
    {
      path: "levelId",
      select: "name",
    },
  ];

  let excludeById = null;

  if (employeeId) {
    excludeById = employeeId;
  }

  const { documents: employees, pagination } = await paginate({
    model: Employee,
    query: filter,
    page,
    limit,
    sort,
    populateOptions,
    excludeById,
  });

  console.log(pagination);

  const stats = await Employee.getEmployeeStats();

  return ApiSuccess.created("Employee Retrived Successfully", {
    employees,
    pagination,
    stats,
  });
}

async function employeeBulkInvite(file, tenantId) {
  const { data } = await tenantService.getTenant(tenantId);
  const tenant = data?.tenant;

  const tempFilePath = saveFileToUploads(file);

  const parsedData = await parseCSVFile(tempFilePath);

  if (parsedData.length < 1) {
    throw ApiError.badRequest("The csv file you provided is empty");
  }

  const invitations = await extractAndValidateData(parsedData, tenantId);

  const newEmployees = [];

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  for (const invite of invitations) {
    const existingEmployee = await Employee.findOne({ email: invite.email });
    if (existingEmployee) {
      console.log(`Skipping already registered email: ${invite.email}`);
      continue; // Skip this iteration if the email is already registered
    }
    const token = crypto.randomBytes(20).toString("hex");
    const plainPassword = crypto.randomBytes(8).toString("hex"); // 8 characters
    const hashedPassword = await hashPassword(plainPassword);

    // Create a new employee
    const newEmployee = await Employee.create({
      email: invite.email,
      name: invite.name,
      tenantId,
      password: hashedPassword,
      jobRole: invite.jobRole,
      levelId: invite.levelId,
    });

    newEmployees.push(newEmployee);

    const inviteUrl = `${process.env.FRONTEND_URL}/${tenant._id}/verify?token=${token}`;

    // Create a new link document in the database
    const link = await Link.create({
      tenantId,
      token,
      name: invite.name,
      email: invite.email,
      url: inviteUrl,
      expiresAt,
      status: "pending",
    });

    const mailOptions = {
      email: invite.email,
      userName: invite.name,
      tenantName: tenant.name,
      inviteUrl,
      plainPassword,
      logo: tenant.logo,
    };

    try {
      const emailInfo = await emailUtils.sendInvitation(mailOptions);
      await Link.findByIdAndUpdate(link._id, { isDelivered: true });
    } catch {
      await Link.findByIdAndUpdate(link._id, { isDelivered: false });
    }
  }

  // fs.unlinkSync(tempFilePath);

  return ApiSuccess.ok(
    `${newEmployees.length} invitations have been sent successfully.`
  );
}

// Update Profile
async function updateEmployee(employeeId, tenantId, profileData = {}, files) {
  const { file, avatar } = files;

  let fileData = null;
  let avatarUrl = null;

  if (file) {
    const fileUrl = await uploadToCloudinary(file.tempFilePath);

    // Determine the file type based on its MIME type
    const fileType = file.mimetype.startsWith("image/") ? "image" : "document";
    fileData = {
      url: fileUrl,
      fileType,
    };
  }

  if (avatar) {
    const imgUrl = await uploadToCloudinary(avatar.tempFilePath);
    avatarUrl = imgUrl;
  }

  const updatePayload = { ...profileData };

  if (fileData) {
    updatePayload.$push = { documents: fileData };
  }
  if (avatarUrl) {
    updatePayload.avatar = avatarUrl;
  }

  const employee = await Employee.findOneAndUpdate(
    {
      _id: employeeId,
      tenantId: tenantId,
    },
    updatePayload,
    { new: true, runValidators: true }
  ).populate([
    {
      path: "lineManager",
      // select: "name",
    },
    {
      path: "reliever",
      // select: "name",
    },
    {
      path: "tenantId",
    },
  ]);

  const leaveBalances = await employee.getLeaveBalances(
    String(employeeId),
    String(tenantId)
  );

  if (!employee) {
    throw ApiError.badRequest("No user with this email or tenant");
  }

  return ApiSuccess.ok("Profile Updated Successfully", {
    employee,
    leaveBalances: leaveBalances.length > 0 ? leaveBalances : [],
  });
}

// Forgot Password
async function forgotPassword(email) {
  const employee = await Employee.findOne({ email }).populate("tenantId");
  if (!employee) {
    throw ApiError.badRequest("No user with this email");
  }

  const token = generateToken({ email });

  const passwordReset = new PasswordReset({
    email,
    token,
  });
  await passwordReset.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const options = {
    email,
    resetUrl,
    name: employee.name ? employee.name : "User",
    color: employee.tenantId.color,
    tenantName: employee.tenantId.name,
    logo: employee.tenantId.logo,
  };

  try {
    await emailUtils.sendForgotPasswordEmail(options);
    return ApiSuccess.ok("Password reset email sent");
  } catch (error) {
    throw ApiError.internalServerError("Error sending reset email");
  }
}

async function resetPassword(token, newPassword) {
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw ApiError.badRequest("Invalid or expired link");
  }

  const passwordReset = await PasswordReset.findOne({
    email: decoded.email,
    token,
  });

  if (!passwordReset) {
    throw ApiError.badRequest("Invalid or expired link");
  }

  const employee = await Employee.findOne({ email: decoded.email }).select(
    "+password"
  );
  if (!employee) {
    throw ApiError.notFound("User not found");
  }

  const hashedPassword = await hashPassword(newPassword);
  employee.password = hashedPassword;
  await employee.save();

  await PasswordReset.deleteOne({ token });

  return ApiSuccess.ok("Password has been reset successfully");
}

async function InviteAndAddEmployee(InviteData = {}, employeeId, tenantId) {
  const { email, firstname, middlename, surname, accountType } = InviteData;

  const employee = await Employee.findOne({ email, tenantId });
  if (employee) {
    throw ApiError.badRequest("Employee with this email already exists");
  }

  const currentEmployee = await Employee.findOne({
    _id: employeeId,
    tenantId,
  });

  const fullname = [currentEmployee.firstname, currentEmployee.surname]
    .filter(Boolean)
    .join(" ");

  const { data } = await tenantService.getTenant(tenantId);
  const tenant = data?.tenant;

  const plainPassword = crypto.randomBytes(8).toString("hex"); // 8 characters
  const hashedPassword = await hashPassword(plainPassword);

  // Create a new employee
  const newEmployee = new Employee({
    email,
    firstname,
    middlename: middlename ? middlename : "",
    surname,
    accountType,
    tenantId,
    password: hashedPassword,
    isEmailVerified: true,
  });

  const inviteUrl = `${process.env.FRONTEND_URL}/login`;
  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: `Invite to ${tenant.name} Leave Board`,
    text: `Hello, you have been invited to join ${tenant.name} leave board by ${fullname}. Your temporary password is: ${plainPassword}. Click on the following link to login to your account: ${inviteUrl}`,
    html: `
      <p>Hi, ${newEmployee.firstname}</p>
      <p>You have been invited to join <strong>${tenant.name}</strong> leave board.</p>
      <p>Your temporary password is: <strong>${plainPassword}</strong></p>
      <p>Click on the following link to login in</p>
      <a href="${inviteUrl}">Go To Leave Board</a>
    `,
  };

  try {
    await emailUtils.sendEmail(mailOptions);
    await newEmployee.save();
    return ApiSuccess.ok(`User added successfully`);
  } catch (error) {
    console.log(error);
    return ApiError.internalServerError(`Error inviting ${email}`);
  }
}

async function addLineManager(payload = {}, tenantId) {
  const { email, firstname, middlename, surname, accountType } = payload;

  const employee = await Employee.findOne({ email, tenantId });
  if (employee) {
    throw ApiError.badRequest("Employee with this email already exists");
  }

  const { data } = await tenantService.getTenant(tenantId);
  const tenant = data?.tenant;

  const plainPassword = crypto.randomBytes(8).toString("hex"); // 8 characters
  const hashedPassword = await hashPassword(plainPassword);

  // Create a new employee
  const newEmployee = new Employee({
    email,
    firstname,
    middlename: middlename ? middlename : "",
    surname,
    accountType,
    tenantId,
    password: hashedPassword,
    isEmailVerified: true,
  });

  const inviteUrl = `${process.env.FRONTEND_URL}/login`;
  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: `Invite to ${tenant.name} Leave Board`,
    text: `Hello, you have been invited to join ${tenant.name} leave board. Your temporary password is: ${plainPassword}. Click on the following link to login to your account: ${inviteUrl}`,
    html: `
      <p>Hi, ${newEmployee.firstname}</p>
      <p>You have been invited to join <strong>${tenant.name}</strong> leave board.</p>
      <p>Your temporary password is: <strong>${plainPassword}</strong></p>
      <p>Click on the following link to login in</p>
      <a href="${inviteUrl}">Go To Leave Board</a>
    `,
  };

  try {
    await emailUtils.sendEmail(mailOptions);
    await newEmployee.save();
    return ApiSuccess.ok(`User added successfully`);
  } catch (error) {
    console.log(error);
    return ApiError.internalServerError(`Error adding ${email}`);
  }
}

async function deleteLineManager(employeeId, tenantId) {
  // 1. Find the employee
  const employee = await Employee.findOne({ _id: employeeId, tenantId });
  if (!employee) {
    throw ApiError.notFound("Employee not found");
  }

  // 2. Remove the employee as lineManager or reliever from other employees
  await Employee.updateMany(
    { lineManager: employeeId, tenantId },
    { $unset: { lineManager: "" } }
  );

  await Employee.updateMany(
    { reliever: employeeId, tenantId },
    { $unset: { reliever: "" } }
  );

  // 3. Finally delete the employee
  await Employee.deleteOne({ _id: employeeId, tenantId });

  return ApiSuccess.ok(
    "Employee deleted successfully and removed as Line Manager/Reliever from others"
  );
}

export default {
  getEmployee,
  updateEmployee,
  getEmployees,
  signIn,
  forgotPassword,
  resetPassword,
  sendInviteToEmployee,
  acceptInvite,
  employeeBulkInvite,
  InviteAndAddEmployee,
  addLineManager,
  deleteLineManager,
  // makeEmployeeAdmin,
};
