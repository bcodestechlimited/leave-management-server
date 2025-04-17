import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  addTenant,
  adminForgotPassword,
  adminLogin,
  adminRegister,
  adminResetPassword,
  getAdmin,
  getTenant,
  getTenants,
} from "../controllers/admin.controller.js";
import { isAuth, isSuperAdmin } from "../../middlewares/auth.js";
import { tenantValidator } from "../validators/tenant.validator.js";
import {
  adminForgotPasswordValidator,
  adminLogInValidator,
  adminRegisterValidator,
  adminResetPasswordValidator,
} from "../validators/admin.validator.js";

const router = express.Router();

router
  .route("/auth/register")
  .post(adminRegisterValidator, adminRegister)
  .all(methodNotAllowed);

router
  .route("/auth/login")
  .post(adminLogInValidator, adminLogin)
  .all(methodNotAllowed);

router.route("/auth").get(isAuth, isSuperAdmin, getAdmin).all(methodNotAllowed);

router
  .route("/auth/forgot-password")
  .post(adminForgotPasswordValidator, adminForgotPassword)
  .all(methodNotAllowed);

router
  .route("/auth/reset-password")
  .post(adminResetPasswordValidator, adminResetPassword)
  .all(methodNotAllowed);

// router
//   .route("/admin/login")
//   .post(isAuth, isAdmin, employeeSignUpValidator, addEmployeeToTenant)
//   .all(methodNotAllowed);

router
  .route("/tenant")
  .post(isAuth, isSuperAdmin, tenantValidator, addTenant)
  .get(isAuth, isSuperAdmin, getTenants)
  .all(methodNotAllowed);

router
  .route("/tenant/:tenantId")
  .get(isAuth, isSuperAdmin, getTenant)
  .all(methodNotAllowed);

// router
//   .route("/tenant/employee")
//   .post(isAuth, isAdmin, employeeSignUpValidator, addEmployeeToTenant)
//   .all(methodNotAllowed);

export default router;
