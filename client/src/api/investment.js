import { apiRequest } from "./base.js";

export const InvestmentAPI = {
  create: (payload) =>
    apiRequest("/investments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  my: () =>
    apiRequest("/investments/my", {
      method: "GET",
    }),
};

