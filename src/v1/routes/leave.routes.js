import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  addLeaveType,
  getLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
  requestLeave,
  getLeaveRequests,
  getSingleLeaveRequest,
  updateLeaveRequest,
  // deleteLeaveRequest,
  getLeaveBalance,
  getEmployeeLeaveRequests,
  getManagerLeaveRequests,
} from "../controllers/leave.controller.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import { isAuth, isEmployee, isTenantAdmin } from "../../middlewares/auth.js";
import {
  leaveTypeValidator,
  leaveTypeUpdateValidator,
  leaveRequestValidator,
  leaveRequestUpdateValidator,
} from "../validators/leave.validator.js";

const router = express.Router();

// Leave Types Routes
router
  .route("/leave-type")
  .get(tenantMiddleware, getLeaveTypes) // Get all leave types for the tenant
  .post(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    leaveTypeValidator,
    addLeaveType
  ) // Add a new leave type
  .all(methodNotAllowed);

router
  .route("/leave-type/:leaveTypeId")
  .put(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    leaveTypeUpdateValidator,
    updateLeaveType
  ) // Update leave type
  .delete(tenantMiddleware, isAuth, isTenantAdmin, deleteLeaveType) // Delete leave type
  .all(methodNotAllowed);

// Leave Requests Routes
router
  .route("/leave-request")
  .get(tenantMiddleware, getLeaveRequests) // Get all leave requests for the tenant
  .post(
    tenantMiddleware,
    isAuth,
    isEmployee,
    leaveRequestValidator,
    requestLeave
  ) // Request a new leave
  .all(methodNotAllowed);

router
  .route("/leave-request/employee")
  .get(tenantMiddleware, isAuth, isEmployee, getEmployeeLeaveRequests) // Get all leave requests for an employee
  .all(methodNotAllowed);

router
  .route("/leave-request/manager")
  .get(tenantMiddleware, isAuth, isEmployee, getManagerLeaveRequests) // Get all leave requests for a manager
  .all(methodNotAllowed);

router
  .route("/leave-request/:leaveRequestId")
  .get(tenantMiddleware, isAuth, getSingleLeaveRequest) // Get a specific leave request
  .put(
    tenantMiddleware,
    isAuth,
    leaveRequestUpdateValidator,
    updateLeaveRequest
  )
  // .delete(tenantMiddleware, isAuth, deleteLeaveRequest) // Delete leave request
  .all(methodNotAllowed);

router
  .route("/leave-request/:leaveRequestId/client")
  .get(tenantMiddleware, isAuth, getSingleLeaveRequest) // Get a specific leave request
  .put(
    tenantMiddleware,
    isAuth,
    leaveRequestUpdateValidator,
    updateLeaveRequest
  )
  // .delete(tenantMiddleware, isAuth, deleteLeaveRequest) // Delete leave request
  .all(methodNotAllowed);

router
  .route("/balance")
  .get(tenantMiddleware, isAuth, isEmployee, getLeaveBalance)
  .all(methodNotAllowed);

export default router;
