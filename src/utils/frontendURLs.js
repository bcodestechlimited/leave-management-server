const frontendBaseURL = process.env.FRONTEND_URL || ""; // Fallback if not set

const rawFrontendURLs = {
  employee: {
    login: "/login",
    leaveDetails: (leaveId) => `/dashboard/employee/leave/${leaveId}`,
    profile: "/dashboard/employee/profile",
  },
  tenant: {
    login: "/client/login",
    dashboard: "/dashboard/tenant",
    leaveDetails: (leaveId) => `/dashboard/tenant/leave/${leaveId}`,
  },
  public: {
    home: "/",
  },
};

function appendBaseURL(urls, baseURL) {
  const result = {};

  for (const key in urls) {
    const value = urls[key];

    if (typeof value === "object") {
      // Recursively handle nested objects
      result[key] = appendBaseURL(value, baseURL);
    } else if (typeof value === "function") {
      // Handle functions (like leaveDetails)
      result[key] = (...args) => `${baseURL}${value(...args)}`;
    } else {
      // Handle simple string routes
      result[key] = `${baseURL}${value}`;
    }
  }

  return result;
}

const frontendURLs = appendBaseURL(rawFrontendURLs, frontendBaseURL);

export default frontendURLs;
