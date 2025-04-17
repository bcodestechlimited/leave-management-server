import asyncWrapper from "../../middlewares/asyncWrapper.js";
import analyticsService from "../services/analytics.service.js";

export const getLeaveRequestAnalytics = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { year } = req.query;
  const result = await analyticsService.getLeaveRequestAnalytics(
    tenantId,
    year
  );
  res.status(201).json(result);
});
