import { verifyToken } from "../config/token.js";
import ApiError from "../utils/apiError.js";
import asyncWrapper from "./asyncWrapper.js";

const isAuth = asyncWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No Token Provided");
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (payload?.isSuperAdmin) {
    req.superAdmin = payload;
  }

  if (payload?.isTenantAdmin) {
    req.tenantAdmin = payload;
  }

  if (payload?.isAdmin) {
    req.admin = payload;
  }

  if (payload?.isEmployee) {
    req.employee = payload;
  }
  //Holds whichever user is logged in
  req.user = payload;
  // console.log({ user: req.user });

  next();
});

//Checks if the user/employee is an admin
const isSuperAdmin = asyncWrapper(async (req, res, next) => {
  if (!req?.user?.isSuperAdmin) {
    throw ApiError.unauthorized("Super Admins Only");
  }
  next();
});

//Checks if the user/employee is an admin
const isAdmin = asyncWrapper(async (req, res, next) => {
  if (!req?.user?.isAdmin) {
    throw ApiError.unauthorized("Employee Admins Only");
  }
  next();
});

//Checks if the user/employee is an employee
const isEmployee = asyncWrapper(async (req, res, next) => {
  if (!req?.user?.isEmployee) {
    throw ApiError.unauthorized("Employees Only");
  }
  next();
});

//Checks if the user is a tenantAdmin
const isTenantAdmin = asyncWrapper(async (req, res, next) => {
  if (!req?.user?.isTenantAdmin) {
    throw ApiError.unauthorized("Client Admins Only");
  }
  next();
});

const isTenantAdminOrAdmin = asyncWrapper(async (req, res, next) => {
  if (!req?.user?.isTenantAdmin || !req?.user?.isAdmin) {
    throw ApiError.unauthorized("Tenant Admins and Admins Only");
  }
  next();
});

export {
  isAuth,
  isSuperAdmin,
  isAdmin,
  isTenantAdmin,
  isEmployee,
  isTenantAdminOrAdmin,
};
