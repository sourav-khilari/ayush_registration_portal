// Simple API client with auth token handling
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getToken() {
  return localStorage.getItem("token");
}

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

