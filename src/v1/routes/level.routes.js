import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  addLevel,
  getLevels,
  updateLevel,
  deleteLevel,
} from "../controllers/level.controller.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import { isAuth, isTenantAdmin } from "../../middlewares/auth.js";
import {
  levelValidator,
  levelUpdateValidator,
} from "../validators/level.validator.js";
import { getLevel } from "../controllers/level.controller.js";

const router = express.Router();

// Level Routes
router
  .route("/")
  .get(tenantMiddleware, isAuth, isTenantAdmin, getLevels) // Get all levels for the tenant
  .post(tenantMiddleware, isAuth, isTenantAdmin, levelValidator, addLevel) // Add a new level
  .all(methodNotAllowed);

router
  .route("/:levelId")
  .get(tenantMiddleware, isAuth, isTenantAdmin, getLevel) // Get details of a specific level
  .put(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    levelUpdateValidator,
    updateLevel
  ) // Update level
  .delete(tenantMiddleware, isAuth, isTenantAdmin, deleteLevel) // Delete level
  .all(methodNotAllowed);

export default router;
