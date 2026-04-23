import { apiRequest } from "./base.js";

export const AuthAPI = {
  login: (payload) => apiRequest("/users/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => {
    const options = { method: "POST" };
    if (payload instanceof FormData) options.body = payload;
    else options.body = JSON.stringify(payload);
    return apiRequest("/users/register", options);
  },
  sendSignupOtp: (payload) => apiRequest("/users/register/send-otp", { method: "POST", body: JSON.stringify(payload) }),
  profile: () => apiRequest("/users/profile", { method: "GET" }),
  updateProfile: (payload) => apiRequest("/users/profile", { method: "PUT", body: JSON.stringify(payload) }),
};

