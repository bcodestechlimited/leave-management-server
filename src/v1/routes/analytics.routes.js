import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";

import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import { isAuth } from "../../middlewares/auth.js";
import { getLeaveRequestAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router
  .route("/leave-requests")
  .get(tenantMiddleware, isAuth, getLeaveRequestAnalytics)
  .all(methodNotAllowed);

export default router;
