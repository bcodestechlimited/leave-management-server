import asyncWrapper from "../../middlewares/asyncWrapper.js";
import employeeService from "../services/employee.service.js";

//Authentication
export const employeeLogin = asyncWrapper(async (req, res, next) => {
  const employeeData = req.body;
  const result = await employeeService.signIn(employeeData);
  res.status(201).json(result);
});

export const employeeSignUp = asyncWrapper(async (req, res, next) => {
  const userData = req.body;
  const { tenantId } = req.tenant;
  const result = await employeeService.signUpWithInviteLink(userData, tenantId);
  res.status(201).json(result);
});

export const employeeForgotPassword = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;
  const result = await employeeService.forgotPassword(email);
  res.status(201).json(result);
});

export const employeeResetPassword = asyncWrapper(async (req, res, next) => {
  const { token, password } = req.body;
  const result = await employeeService.resetPassword(token, password);
  res.status(201).json(result);
});

// Employees
export const getEmployees = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const result = await employeeService.getEmployees(
    query,
    tenantId,
    req?.user?.employeeId
  );
  res.status(200).json(result);
});

export const getAuthEmployee = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { employeeId } = req.employee;
  const result = await employeeService.getEmployee(employeeId, tenantId);
  res.status(201).json(result);
});

export const updateAuthEmployee = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { employeeId } = req.employee;
  const { isAdmin, ...profileData } = req.body;
  const result = await employeeService.updateEmployee(
    employeeId,
    tenantId,
    profileData,
    req?.files ? req.files : {}
  );
  res.status(200).json(result);
});

export const getEmployee = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { employeeId } = req.params;
  const result = await employeeService.getEmployee(employeeId, tenantId);
  res.status(201).json(result);
});

export const updateEmployee = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { employeeId } = req.params;
  const profileData = req.body;
  const result = await employeeService.updateEmployee(
    employeeId,
    tenantId,
    profileData,
    req?.files ? req.files : {}
  );
  res.status(200).json(result);
});

//Invites
export const sendInviteToEmployee = asyncWrapper(async (req, res, next) => {
  const inviteData = req.body;
  const { tenantId } = req.tenant;
  const result = await employeeService.sendInviteToEmployee(
    inviteData,
    tenantId
  );
  res.status(201).json(result);
});

export const acceptInvite = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { token } = req.query;
  const result = await employeeService.acceptInvite(token, tenantId);
  res.status(201).json(result);
});

export const employeeBulkInvite = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const file = req.files.file;
  const result = await employeeService.employeeBulkInvite(file, tenantId);
  res.status(201).json(result);
});

//Admins

export default {
  employeeForgotPassword,
};
