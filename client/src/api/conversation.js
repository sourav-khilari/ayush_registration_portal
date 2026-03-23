import { apiRequest } from "./base.js";

export const ConversationAPI = {
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
  sendMessageToConversation: (conversationId, text) =>
    apiRequest(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};

