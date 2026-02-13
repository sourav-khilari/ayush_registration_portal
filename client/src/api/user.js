import { apiRequest } from "./base.js";

export const UserAPI = {
  // List government officials (admin only)
  listGovOfficials: (verified = null) => {
    const qs = new URLSearchParams();
    if (verified !== null) qs.set("verified", verified);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiRequest(`/users/gov-officials${suffix}`, { method: "GET" });
  },
  // Verify a government official (admin only)
  verifyGovOfficial: (userId) => {
    return apiRequest(`/users/${userId}/verify-gov`, { method: "POST" });
  },
};
