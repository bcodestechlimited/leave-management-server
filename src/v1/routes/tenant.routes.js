import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  getAllInviteLinks,
  getTenant,
  getTenantDetails,
  tenantForgotPassword,
  tenantLogin,
  tenantResetPassword,
  updateTenantProfile,
} from "../controllers/tenant.controller.js";
import { validateMongoIdParam } from "../validators/param.validator.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import {
  tenantForgotPasswordValidator,
  tenantLoginValidator,
  tenantResetPasswordValidator,
  tenantUpdateValidator,
} from "../validators/tenant.validator.js";
import { isAuth, isTenantAdmin } from "../../middlewares/auth.js";
import {
  addEmployeeValidator,
  employeeProfileUpdateValidator,
} from "../validators/employee.validator.js";
import {
  addLineManager,
  deleteEmployee,
  deleteLineManager,
  getEmployee,
  getEmployees,
  updateEmployee,
} from "../controllers/employee.controller.js";
import { generateMonthlyLeaveReports } from "../controllers/leave.controller.js";

const router = express.Router();

//Authentication
router
  .route("/auth")
  .get(tenantMiddleware, isAuth, isTenantAdmin, getTenantDetails)
  .put(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    tenantUpdateValidator,
    updateTenantProfile
  )
  .all(methodNotAllowed);

router
  .route("/auth/signin")
  .post(tenantLoginValidator, tenantLogin)
  .all(methodNotAllowed);

router
  .route("/auth/forgot-password")
  .post(tenantForgotPasswordValidator, tenantForgotPassword)
  .all(methodNotAllowed);

router
  .route("/auth/reset-password")
  .post(tenantResetPasswordValidator, tenantResetPassword)
  .all(methodNotAllowed);

router
  .route("/link")
  .get(tenantMiddleware, isAuth, isTenantAdmin, getAllInviteLinks)
  .all(methodNotAllowed);

// Employees
router
  .route("/employee")
  .get(tenantMiddleware, isAuth, isTenantAdmin, getEmployees)
  .all(methodNotAllowed);

router
  .route("/employee/:employeeId")
  .get(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    validateMongoIdParam("employeeId"),
    getEmployee
  )
  .put(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    employeeProfileUpdateValidator,
    validateMongoIdParam("employeeId"),
    updateEmployee
  )
  .delete(tenantMiddleware, isAuth, isTenantAdmin, deleteEmployee)
  .all(methodNotAllowed);

router
  .route("/line-manager")
  .post(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    addEmployeeValidator,
    addLineManager
  )
  .all(methodNotAllowed);

router
  .route("/line-manager/:employeeId")
  .delete(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    validateMongoIdParam("employeeId"),
    deleteLineManager
  )
  .all(methodNotAllowed);

router
  .route("/leave-report")
  .get(tenantMiddleware, isAuth, isTenantAdmin, generateMonthlyLeaveReports)
  .all(methodNotAllowed);

//Public
router
  .route("/:tenantId")
  .get(validateMongoIdParam("tenantId"), getTenant)
  .all(methodNotAllowed);

export default router;
