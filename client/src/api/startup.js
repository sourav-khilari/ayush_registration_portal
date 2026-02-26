import { apiRequest } from "./base.js";

export const StartupAPI = {
  create: (payload) => apiRequest("/startups", { method: "POST", body: JSON.stringify(payload) }),
  mine: () => apiRequest("/startups/mine", { method: "GET" }),
  get: (id) => apiRequest(`/startups/${id}`, { method: "GET" }),
  update: (id, payload) => apiRequest(`/startups/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => apiRequest(`/startups/${id}`, { method: "DELETE" }),
  // Separate API for Profit vs Expense bar chart
  profitExpenseChart: (id) => apiRequest(`/startups/${id}/charts/profit-expense`, { method: "GET" }),
  /**
   * List startups available to investors with optional filters.
   * filters: { category, profitStatus, minRevenue, maxRevenue, location, q }
   */
  investorList: (filters = {}) => {
    const qs = new URLSearchParams();
    if (filters.category) qs.set("category", filters.category);
    if (filters.profitStatus) qs.set("profitStatus", filters.profitStatus);
    if (filters.minRevenue != null && filters.minRevenue !== "")
      qs.set("minRevenue", filters.minRevenue);
    if (filters.maxRevenue != null && filters.maxRevenue !== "")
      qs.set("maxRevenue", filters.maxRevenue);
    if (filters.location) qs.set("location", filters.location);
    if (filters.q) qs.set("q", filters.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiRequest(`/startups/investor${suffix}`, { method: "GET" });
  },
  /**
   * List startups for government officials/admins.
   * filters: { status, q }
   */
  officialList: (filters = {}) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.q) qs.set("q", filters.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiRequest(`/startups${suffix}`, { method: "GET" });
  },
  /**
   * Update status via the official/admin endpoint.
   */
  updateStatusByOfficial: (id, status) =>
    apiRequest(`/startups/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

