import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  addEmployeeValidator,
  bulkEmployeeInviteValidator,
  employeeForgotPasswordValidator,
  employeeInviteValidator,
  employeeLogInValidator,
  employeeProfileUpdateValidator,
  employeeResetPasswordValidator,
  employeeSignUpValidator,
} from "../validators/employee.validator.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import {
  acceptInvite,
  employeeBulkInvite,
  employeeForgotPassword,
  employeeLogin,
  employeeResetPassword,
  employeeSignUp,
  getAuthEmployee,
  getEmployees,
  InviteAndAddEmployee,
  sendInviteToEmployee,
  updateAuthEmployee,
  updateEmployee,
} from "../controllers/employee.controller.js";
import {
  isAdmin,
  isAuth,
  isEmployee,
  isTenantAdmin,
} from "../../middlewares/auth.js";
import { validateMongoIdParam } from "../validators/param.validator.js";

const router = express.Router();

router
  .route("/")
  .get(tenantMiddleware, isAuth, getEmployees)
  .all(methodNotAllowed);

//Authentication
router
  .route("/auth")
  .get(tenantMiddleware, isAuth, isEmployee, getAuthEmployee)
  .put(
    tenantMiddleware,
    isAuth,
    isEmployee,
    employeeProfileUpdateValidator,
    updateAuthEmployee
  )
  .all(methodNotAllowed);

router
  .route("/auth/signin")
  .post(employeeLogInValidator, employeeLogin)
  .all(methodNotAllowed);

router
  .route("/auth/signup")
  .post(tenantMiddleware, employeeSignUpValidator, employeeSignUp)
  .all(methodNotAllowed);

router
  .route("/auth/forgot-password")
  .post(employeeForgotPasswordValidator, employeeForgotPassword)
  .all(methodNotAllowed);

router
  .route("/auth/reset-password")
  .post(employeeResetPasswordValidator, employeeResetPassword)
  .all(methodNotAllowed);

//Invites
router
  .route("/invite")
  .post(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    employeeInviteValidator,
    sendInviteToEmployee
  )
  .put(tenantMiddleware, acceptInvite)
  .all(methodNotAllowed);

//Emergency Feature
router
  .route("/add")
  .post(tenantMiddleware, isAuth, addEmployeeValidator, InviteAndAddEmployee)
  .all(methodNotAllowed);

router
  .route("/bulk-invite")
  .post(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    bulkEmployeeInviteValidator,
    employeeBulkInvite
  )
  .all(methodNotAllowed);

// Employee Admins
router
  .route("/admin/employee/:employeeId")
  .put(
    tenantMiddleware,
    isAuth,
    isAdmin,
    employeeProfileUpdateValidator,
    // makeEmployeeAdminValidator,
    validateMongoIdParam("employeeId"),
    updateEmployee
  )
  .all(methodNotAllowed);

export default router;
