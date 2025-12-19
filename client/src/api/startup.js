import { apiRequest } from "./base.js";

export const StartupAPI = {
  create: (payload) => apiRequest("/startups", { method: "POST", body: JSON.stringify(payload) }),
  mine: () => apiRequest("/startups/mine", { method: "GET" }),
  get: (id) => apiRequest(`/startups/${id}`, { method: "GET" }),
  update: (id, payload) => apiRequest(`/startups/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (id) => apiRequest(`/startups/${id}`, { method: "DELETE" }),
};

