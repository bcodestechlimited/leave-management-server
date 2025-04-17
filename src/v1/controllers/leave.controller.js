import asyncWrapper from "../../middlewares/asyncWrapper.js";
import leaveService from "../services/leave.service.js";

// Leave Types
export const addLeaveType = asyncWrapper(async (req, res, next) => {
  const leaveTypeData = req.body;
  const { tenantId } = req.tenant;
  const result = await leaveService.addLeaveType(leaveTypeData, tenantId);
  res.status(201).json(result);
});

export const getLeaveTypes = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const result = await leaveService.getLeaveTypes(query, tenantId);
  res.status(200).json(result);
});

export const updateLeaveType = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const leaveTypeData = req.body;
  const { leaveTypeId } = req.params;
  const result = await leaveService.updateLeaveType(
    leaveTypeId,
    leaveTypeData,
    tenantId
  );
  res.status(200).json(result);
});

export const deleteLeaveType = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { leaveTypeId } = req.params;
  const result = await leaveService.deleteLeaveType(leaveTypeId, tenantId);
  res.status(200).json(result);
});

// Leave Requests
export const requestLeave = asyncWrapper(async (req, res, next) => {
  const leaveRequestData = req.body;
  const { tenantId } = req.tenant;
  const { employeeId } = req.employee; // Employee making the request
  const result = await leaveService.requestLeave(
    leaveRequestData,
    employeeId,
    tenantId
  );
  res.status(201).json(result);
});

export const getLeaveRequests = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const result = await leaveService.getLeaveRequests(query, tenantId);
  res.status(200).json(result);
});

export const getEmployeeLeaveRequests = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const { employeeId } = req.employee;
  const result = await leaveService.getLeaveRequests(
    { ...query, employee: employeeId },
    tenantId
  );
  res.status(200).json(result);
});

export const getManagerLeaveRequests = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const { employeeId } = req.employee;

  const result = await leaveService.getLeaveRequests(
    { ...query, lineManager: employeeId },
    tenantId
  );
  res.status(200).json(result);
});

export const getSingleLeaveRequest = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { leaveRequestId } = req.params;
  const result = await leaveService.getSingleLeaveRequest(
    leaveRequestId,
    tenantId
  );
  res.status(200).json(result);
});

export const updateLeaveRequest = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const leaveRequestData = req.body;
  const { leaveRequestId } = req.params;
  const { employeeId } = req.employee;
  const result = await leaveService.updateLeaveRequest(
    leaveRequestId,
    leaveRequestData,
    employeeId,
    tenantId
  );
  res.status(200).json(result);
});

export const updateLeaveRequestByClientAdmin = asyncWrapper(
  async (req, res, next) => {
    const { tenantId } = req.tenant;
    const leaveRequestData = req.body;
    const { leaveRequestId } = req.params;
    // const { employeeId } = req.employee;
    const result = await leaveService.updateLeaveRequestByClientAdmin(
      leaveRequestId,
      leaveRequestData,
      tenantId
    );
    res.status(200).json(result);
  }
);

export const deleteLeaveRequest = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { leaveRequestId } = req.params;
  const result = await leaveService.deleteLeaveRequest(
    leaveRequestId,
    tenantId
  );
  res.status(200).json(result);
});

// Leave Balance
export const getLeaveBalance = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { employeeId } = req.employee; // Employee making the request
  const result = await leaveService.getLeaveBalance(employeeId, tenantId);
  res.status(200).json(result);
});
