import ApiSuccess from "../../utils/apiSuccess.js";
import { LeaveHistory } from "../models/leave.model.js";

async function getLeaveRequestAnalytics(tenantId, year) {
  const analytics = await LeaveHistory.generateChartData(tenantId, year);
  return ApiSuccess.ok("Analytics Retrieved Successfully", {
    analytics,
  });
}

export default {
  getLeaveRequestAnalytics,
};
