import mongoose from "mongoose";
import { generateToken } from "../../config/token.js";
import User from "../models/user.model.js";
import ApiError from "../../utils/apiError.js";
import { hashPassword, validatePassword } from "../../utils/validationUtils.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import OTP from "../models/otp.model.js";
import Employee from "../models/employee.model.js";
import e from "express";

async function findUserByEmail(email) {
  const user = await User.findOne({ email, roles: { $in: ["admin"] } });
  if (!user) {
    throw ApiError.notFound("user account not found");
  }
  return user;
}

async function findUserByIdOrEmail(identifier) {
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  const user = await User.findOne(
    isObjectId ? { _id: identifier } : { email: identifier }
  );

  if (!user) {
    throw ApiError.notFound("User Not Found");
  }

  return user;
}

async function adminRegister(userData = {}) {
  const { roles, password, ...userDataWithoutRoles } = userData;
  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    ...userDataWithoutRoles,
    password: hashedPassword,
  });

  return ApiSuccess.created("Registration Successful", {
    user,
  });
}

async function adminLogin(userData = {}) {
  const { email, password } = userData;

  const user = await User.findOne({ email: email }).select("+password");
  if (!user) {
    throw ApiError.notFound("User with this email does not exist");
  }

  await validatePassword(password, user.password);

  if (!user.isEmailVerified) {
    throw ApiError.forbidden("Email Not Verified");
  }

  user.password = undefined;

  const token = generateToken({
    userId: user._id,
    roles: user.roles,
    isSuperAdmin: true,
  });

  return ApiSuccess.ok("Login Successful", {
    user,
    token,
  });
}
async function adminLoginAsEmployee(userData = {}) {
  const { email, password, employeeEmail } = userData;

  const user = await User.findOne({ email: email }).select("+password");
  if (!user) {
    throw ApiError.notFound("User with this email does not exist");
  }

  await validatePassword(password, user.password);

  if (!user.isEmailVerified) {
    throw ApiError.forbidden("Email Not Verified");
  }

  const employee = await Employee.findOne({ email: employeeEmail }).select(
    "+password"
  );

  if (!employee) {
    throw ApiError.badRequest("No employee with this email");
  }

  if (!employee.isEmailVerified) {
    throw ApiError.badRequest("Employee email has not been verified");
  }

  const token = generateToken({
    employeeId: employee._id,
    isAdmin: employee.isAdmin,
    isEmployee: true,
    roles: employee.isAdmin ? ["admin", "employee"] : ["employee"],
  });

  user.password = undefined;
  employee.password = undefined;

  return ApiSuccess.ok("Login Successful", {
    employee,
    token,
  });
}

async function getAdmin(userId) {
  const user = await findUserByIdOrEmail(userId);
  if (!user) {
    throw ApiError.notFound("Admin Not Found");
  }

  return ApiSuccess.ok("Admin Retrieved Successfully", {
    user,
  });
}

async function adminForgotPassword({ email }) {
  const user = await findUserByEmail(email);
  const otpNumber = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP

  // Save OTP to the database or send via email
  const newOtp = await OTP.create({ email: user.email });

  // Optionally, send OTP via email
  // await emailUtils.sendOTP(email, "Admin", otp);

  return ApiSuccess.ok("Password reset token sent to the admin's email");
}

async function adminResetPassword({ email, otp, password }) {
  const user = await findUserByEmail(email);

  if (
    admin.resetPasswordToken !== otp ||
    admin.resetPasswordExpires < Date.now()
  ) {
    throw ApiError.badRequest("Invalid or Expired OTP");
  }

  admin.password = await hashPassword(password);
  admin.resetPasswordToken = undefined;
  admin.resetPasswordExpires = undefined;
  await admin.save();

  return ApiSuccess.ok("Password reset successful");
}

export default {
  adminRegister,
  adminLogin,
  getAdmin,
  adminForgotPassword,
  adminResetPassword,
  adminLoginAsEmployee,
};
