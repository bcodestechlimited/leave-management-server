import express from "express";
import { isAuth, isTenantAdmin } from "../../../middlewares/auth.js";
import { tenantMiddleware } from "../../../middlewares/tenant.middleware.js";
import {
  getSingleLeaveRequest,
  updateLeaveRequestByClientAdmin,
} from "../../controllers/leave.controller.js";
import { leaveRequestUpdateByClientValidator } from "../../validators/leave.validator.js";
import methodNotAllowed from "../../../middlewares/methodNotAllowed.js";

const router = express.Router();

router
  .route("/leave/leave-request/:leaveRequestId")
  .get(tenantMiddleware, isAuth, getSingleLeaveRequest) // Get a specific leave request
  .put(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    leaveRequestUpdateByClientValidator,
    updateLeaveRequestByClientAdmin
  )
  // .delete(tenantMiddleware, isAuth, deleteLeaveRequest) // Delete leave request
  .all(methodNotAllowed);

export default router;
