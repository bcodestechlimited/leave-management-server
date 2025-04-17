import mongoose from "mongoose";
import ApiError from "../utils/apiError.js";
import tenantService from "../v1/services/tenant.service.js";
import asyncWrapper from "./asyncWrapper.js";

const tenantMiddleware = asyncWrapper(async (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"];

  if (!tenantId || !mongoose.isValidObjectId(tenantId)) {
    throw ApiError.unauthorized("Tenant ID is required");
  }

  console.log({ tenantId });

  await tenantService.getTenant(tenantId);
  req.tenant = { tenantId };
  next();
});

export { tenantMiddleware };
