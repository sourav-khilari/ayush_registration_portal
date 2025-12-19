import { apiRequest } from "./base.js";

// Requirements API (for AYUSH sector-specific document requirements)
export const RequirementsAPI = {
  get: (sector, applicationType) => apiRequest(`/requirements/${encodeURIComponent(sector)}/${encodeURIComponent(applicationType)}`, { method: "GET" }),
  getCommon: (sector, applicationType) => apiRequest(`/requirements/${encodeURIComponent(sector)}/${encodeURIComponent(applicationType)}/common`, { method: "GET" }),
};

