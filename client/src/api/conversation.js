import { apiRequest } from "./base.js";

export const ConversationAPI = {
  // Current user: list all conversations (for notification center)
  listMine: (opts = {}) => {
    const q = opts?.q ? `?q=${encodeURIComponent(opts.q)}` : "";
    return apiRequest(`/conversations/mine${q}`, { method: "GET" });
  },

  // Investor: get/create their conversation for a startup
  getMineForStartup: (startupId) =>
    apiRequest(`/conversations/startup/${startupId}/mine`, { method: "GET" }),

  // Startup owner: list investor conversations for a startup
  listForStartup: (startupId) =>
    apiRequest(`/conversations/startup/${startupId}/list`, { method: "GET" }),

  // Get full conversation by id
  getById: (conversationId) =>
    apiRequest(`/conversations/${conversationId}`, { method: "GET" }),

  // Send message to a specific conversation
  sendMessageToConversation: (conversationId, text, attachment) =>
    apiRequest(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, attachment }),
    }),

  markSeen: (conversationId) =>
    apiRequest(`/conversations/${conversationId}/seen`, { method: "POST" }),

  toggleBlock: (conversationId, blocked) =>
    apiRequest(`/conversations/${conversationId}/block`, {
      method: "POST",
      body: JSON.stringify({ blocked }),
    }),

  report: (conversationId, reason) =>
    apiRequest(`/conversations/${conversationId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  uploadAttachment: async (file) => {
    const token = localStorage.getItem("token");
    const base = import.meta.env.VITE_API_BASE || "/api";
    const fd = new FormData();
    fd.append("file", file);
    const resp = await fetch(`${base}/conversations/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.message || "Upload failed");
    return data;
  },
};

