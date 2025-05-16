import Tenant from "../models/tenant.model.js"; // Adjust path as needed
import ApiError from "../../utils/apiError.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import { hashPassword, validatePassword } from "../../utils/validationUtils.js";
import { generateToken, verifyToken } from "../../config/token.js";
import { paginate } from "../../utils/paginate.js";
import Link from "../models/link.model.js";
import crypto from "crypto";
import emailUtils from "../../utils/emailUtils.js";
import PasswordReset from "../models/passwordReset.model.js";
import { uploadToCloudinary } from "./upload.service.js";

async function getTenantByID(tenantId) {
  if (!tenantId) {
    throw ApiError.badRequest("Client ID not provided");
  }
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw ApiError.badRequest("No client with the client ID provided");
  }
  return tenant;
}

async function addTenant(tenantData = {}, files = {}) {
  const { name, color, email } = tenantData;
  const { logo } = files;

  // Check if a tenant with the same name already exists
  const existingTenant = await Tenant.findOne({ name });
  if (existingTenant) {
    throw ApiError.badRequest("A client with this name already exists.");
  }

  const plainPassword = crypto.randomBytes(6).toString("hex");
  const hashedPassword = await hashPassword(plainPassword);
  const logoImageURL = await uploadToCloudinary(logo.tempFilePath);

  // Create a new tenant
  const tenant = new Tenant({
    name,
    logo: logoImageURL,
    color,
    email,
    password: hashedPassword,
  });
  await tenant.save();

  let message;
  let emailInfo;

  try {
    emailInfo = await emailUtils.sendWelcomeEmailToTenant({
      tenantId: tenant._id,
      email,
      plainPassword,
      loginUrl: `${process.env.FRONTEND_URL}/client/login`,
    });
  } catch {
    console.log("There was an error sending an email");
  }

  if (!emailInfo) {
    message = `Client added successfully but email not delivered`;
  } else {
    message = `Client added successfully, credentials sent to ${emailInfo.envelope.to}`;
  }

  return ApiSuccess.created(message);
}

async function getTenants(query = {}) {
  const tenants = await Tenant.find({});
  return ApiSuccess.created("Client retrieved successfully", { tenants });
}

async function getTenant(tenantId) {
  const tenant = await getTenantByID(tenantId);
  return ApiSuccess.created("Client retrieved successfully", { tenant });
}

// Update Tenant Profile
async function updateTenantProfile(tenantId, profileData = {}, files = {}) {
  const { logo } = files;


  let logoURL;

  if (logo) {
    const imgUrl = await uploadToCloudinary(logo.tempFilePath);
    logoURL = imgUrl;
  }

  const updatePayload = { ...profileData };
  updatePayload.logo = logoURL;

  const tenant = await Tenant.findOneAndUpdate(
    {
      _id: tenantId,
    },
    updatePayload,
    { new: true, runValidators: true }
  );

  if (!tenant) {
    throw ApiError.badRequest("No user with this email or tenant");
  }

  return ApiSuccess.ok("Profile Updated Successfully", {
    tenant,
  });
}

async function tenantLogin(tenantData) {
  const { email, password } = tenantData;
  const tenant = await Tenant.findOne({ email }).select("+password");

  if (!tenant) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  await validatePassword(password, tenant.password);

  const token = generateToken({
    tenantId: tenant._id,
    isTenantAdmin: true,
    roles: ["tenant"],
  });

  tenant.password = undefined;
  return ApiSuccess.created("Login successful", {
    tenant,
    token,
  });
}

async function getLinks(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.$or = [
      { tenantId: { $regex: search, $options: "i" } },
      { token: { $regex: search, $options: "i" } },
      { url: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const { documents: links, pagination } = await paginate({
    model: Link,
    query: filter,
    page,
    limit,
    sort,
  });

  return ApiSuccess.created("Links retrieved successfully", {
    links,
    pagination,
  });
}

// Forgot Password
async function forgotPassword(email) {
  const tenant = await Tenant.findOne({ email });
  if (!tenant) {
    throw ApiError.badRequest("No user with this email");
  }

  const token = generateToken({ email });

  const passwordReset = new PasswordReset({
    email,
    token,
  });
  await passwordReset.save();

  const resetUrl = `${process.env.FRONTEND_URL}/tenant/reset-password?token=${token}`;

  const options = {
    email: tenant.email,
    resetUrl,
    name: tenant.name,
    color: tenant.color,
    tenantName: tenant.name,
    logo: tenant.logo,
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

  const tenant = await Tenant.findOne({ email: decoded.email }).select(
    "+password"
  );
  if (!tenant) {
    throw ApiError.notFound("User not found");
  }

  const hashedPassword = await hashPassword(newPassword);
  tenant.password = hashedPassword;
  await tenant.save();

  await PasswordReset.deleteOne({ token });

  return ApiSuccess.ok("Password has been reset successfully");
}

export default {
  addTenant,
  getTenants,
  getTenant,
  tenantLogin,
  updateTenantProfile,
  forgotPassword,
  resetPassword,
  getLinks,
};
