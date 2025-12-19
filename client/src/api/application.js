import { apiRequest } from "./base.js";

// Application API
export const ApplicationAPI = {
  create: (payload) => apiRequest("/applications", { method: "POST", body: JSON.stringify(payload) }),
  submit: (id, payload) => apiRequest(`/applications/${id}/submit`, { method: "POST", body: JSON.stringify(payload || {}) }),
  get: (id) => apiRequest(`/applications/${id}`, { method: "GET" }),
  // For startup owners
  getMyApplications: (opts = {}) => {
    const qs = new URLSearchParams();
    if (opts.status) qs.set('status', opts.status);
    if (opts.sector) qs.set('sector', opts.sector);
    if (opts.application_type) qs.set('application_type', opts.application_type);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/applications/my/list${suffix}`, { method: "GET" });
  },
  getMyApplication: (id) => apiRequest(`/applications/my/${id}`, { method: "GET" }),
};

