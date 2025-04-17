import asyncWrapper from "../../middlewares/asyncWrapper.js";
import adminService from "../services/admin.service.js";
import employeeService from "../services/employee.service.js";
import tenantService from "../services/tenant.service.js";

export const adminRegister = asyncWrapper(async (req, res, next) => {
  const userData = req.body;
  const result = await adminService.adminRegister(userData);
  res.status(201).json(result);
});

export const adminLogin = asyncWrapper(async (req, res, next) => {
  const userData = req.body;
  const result = await adminService.adminLogin(userData);
  res.status(200).json(result);
});

export const getAdmin = asyncWrapper(async (req, res, next) => {
  const { userId } = req.user;
  const result = await adminService.getAdmin(userId);
  res.status(200).json(result);
});

export const adminForgotPassword = asyncWrapper(async (req, res, next) => {
  const userData = req.body;
  const result = await adminService.adminForgotPassword(userData);
  res.status(200).json(result);
});

export const adminResetPassword = asyncWrapper(async (req, res, next) => {
  const userData = req.body;
  const result = await adminService.adminResetPassword(userData);
  res.status(200).json(result);
});

export const addTenant = asyncWrapper(async (req, res, next) => {
  const tenantData = req.body;
  const result = await tenantService.addTenant(tenantData, req.files);
  res.status(201).json(result);
});

export const getTenants = asyncWrapper(async (req, res, next) => {
  const result = await tenantService.getTenants();
  res.status(200).json(result);
});

export const getTenant = asyncWrapper(async (req, res, next) => {
  const tenantId = req.params.tenantId;
  const result = await tenantService.getTenant(tenantId);
  res.status(200).json(result);
});

export const addEmployeeToTenant = asyncWrapper(async (req, res, next) => {
  const employeeData = req.body;
  const result = await employeeService.addEmployeeToTenant(employeeData);
  res.status(201).json(result);
});
