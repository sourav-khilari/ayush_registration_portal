import { apiRequest } from "./base.js";

export const DocumentAPI = {
  requirements: (sector, applicationType) => apiRequest(`/documents/requirements/list?sector=${encodeURIComponent(sector || '')}&application_type=${encodeURIComponent(applicationType || '')}`, { method: "GET" }),
  list: (opts = {}) => {
    const qs = new URLSearchParams();
    if (opts.startup_id) qs.set('startup_id', opts.startup_id);
    if (opts.application_id) qs.set('application_id', opts.application_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/documents/list${suffix}`, { method: "GET" });
  },
  upload: (file, opts = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (opts.doc_category_declared) form.append("doc_category_declared", opts.doc_category_declared);
    if (opts.document_name) form.append("document_name", opts.document_name);
    if (opts.description) form.append("description", opts.description);
    if (opts.application_id) form.append("application_id", opts.application_id);
    if (opts.startup_id) form.append("startup_id", opts.startup_id);
    return apiRequest("/documents/upload", { method: "POST", body: form });
  },
  get: (id) => apiRequest(`/documents/${id}`, { method: "GET" }),
  reassign: (id, payload) => apiRequest(`/documents/${id}/reassign`, { method: "POST", body: JSON.stringify(payload) }),
  verify: (id) => apiRequest(`/documents/${id}/verify`, { method: "POST" }),
  replace: (id, file, opts = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (opts.document_name) form.append("document_name", opts.document_name);
    return apiRequest(`/documents/${id}/replace`, { method: "POST", body: form });
  },
  // Email lookup for OTP (Step 1: extract last4 and request OTP)
  emailLookup: (payload) => apiRequest("/documents/email-lookup", { method: "POST", body: JSON.stringify(payload) }),
  // Verify OTP (Step 2: verify the OTP)
  verifyOtp: (payload) => apiRequest("/documents/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  // Notify registration summary (oaky)
  notifyRegistration: (payload) => apiRequest("/documents/oaky", { method: "POST", body: JSON.stringify(payload) }),
};

