// Simple API client with auth token handling
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getToken() {
  return localStorage.getItem("token");
}

// export async function apiRequest(path, options = {}) {
//   // const headers = new Headers(options.headers || {});
//   // headers.set("Content-Type", options.body instanceof FormData ? undefined : "application/json");
//   // const token = getToken();
//   // if (token) headers.set("Authorization", `Bearer ${token}`);
//   const headers = new Headers(options.headers || {});
// if (!(options.body instanceof FormData)) {
//   headers.set("Content-Type", "application/json");
// }
// // then set Authorization if token exists
// const token = getToken();
// if (token) headers.set("Authorization", `Bearer ${token}`);

//   const resp = await fetch(`${API_BASE}${path}`, {
//     ...options,
//     headers,
//   });

//   const isJson = resp.headers.get("content-type")?.includes("application/json");
//   const data = isJson ? await resp.json() : await resp.text();
//   if (!resp.ok) {
//     const base = (isJson && data?.message) || resp.statusText || "Request failed";
//     const detail = isJson && data?.error ? `: ${data.error}` : "";
//     const message = `${base}${detail}`;
//     throw new Error(message);
//   }
//   return data;
// }
export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = resp.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await resp.json() : await resp.text();

  if (!resp.ok) {
    // Build the best possible error message without forcing objects into strings
    let message = resp.statusText || `HTTP ${resp.status}`;

    if (isJson) {
      // Prefer common fields like message or error.message
      if (typeof data === "string" && data.length) {
        message = data;
      } else if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        if (typeof data.error === "string") message = data.error;
        else if (data.error?.message) message = data.error.message;
        else message = JSON.stringify(data.error);
      } else {
        // Fallback: stringify the full object (safe)
        message = JSON.stringify(data);
      }
    } else if (typeof data === "string" && data.length) {
      message = data;
    }

    // Create an Error and attach useful metadata
    const err = new Error(message);
    err.status = resp.status;
    err.response = data; // parsed JSON or text
    throw err;
  }

  return data;
}

export const AuthAPI = {
  login: (payload) => apiRequest("/users/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => apiRequest("/users/register", { method: "POST", body: JSON.stringify(payload) }),
  profile: () => apiRequest("/users/profile", { method: "GET" }),
  updateProfile: (payload) => apiRequest("/users/profile", { method: "PUT", body: JSON.stringify(payload) }),
};

export const StartupAPI = {
  create: (payload) => apiRequest("/startups", { method: "POST", body: JSON.stringify(payload) }),
  mine: () => apiRequest("/startups/mine", { method: "GET" }),
  get: (id) => apiRequest(`/startups/${id}`, { method: "GET" }),
  update: (id, payload) => apiRequest(`/startups/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => apiRequest(`/startups/${id}`, { method: "DELETE" }),
};

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

// Requirements API (for AYUSH sector-specific document requirements)
export const RequirementsAPI = {
  get: (sector, applicationType) => apiRequest(`/requirements/${encodeURIComponent(sector)}/${encodeURIComponent(applicationType)}`, { method: "GET" }),
  getCommon: (sector, applicationType) => apiRequest(`/requirements/${encodeURIComponent(sector)}/${encodeURIComponent(applicationType)}/common`, { method: "GET" }),
};

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


