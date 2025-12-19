import { apiRequest } from "./base.js";

export const AuthAPI = {
  login: (payload) => apiRequest("/users/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => apiRequest("/users/register", { method: "POST", body: JSON.stringify(payload) }),
  profile: () => apiRequest("/users/profile", { method: "GET" }),
  updateProfile: (payload) => apiRequest("/users/profile", { method: "PUT", body: JSON.stringify(payload) }),
};

