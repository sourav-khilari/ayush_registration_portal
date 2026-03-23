import React, { useEffect, useState } from "react";
import { ConversationAPI } from "../../api";

export default function ChatPanel({ startupId, conversationId, currentUser, title }) {
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pollingEnabled, setPollingEnabled] = useState(false);

  useEffect(() => {
    if (!startupId && !conversationId) return;
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = conversationId
          ? await ConversationAPI.getById(conversationId)
          : await ConversationAPI.getMineForStartup(startupId);
        if (!mounted) return;
        setConversation(res.conversation || null);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load chat");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    // Disable aggressive polling by default (can be enabled via UI)
    let id = null;
    if (pollingEnabled) {
      id = setInterval(load, 5000);
    }
    return () => {
      mounted = false;
      if (id) clearInterval(id);
    };
  }, [startupId, conversationId, pollingEnabled]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      setSending(true);
      // Ensure we have a conversation id to send to
      let convoId = conversationId || conversation?._id;
      if (!convoId && startupId) {
        const mine = await ConversationAPI.getMineForStartup(startupId);
        convoId = mine?.conversation?._id;
      }
      if (!convoId) {
        throw new Error("Conversation not ready yet");
      }
      const res = await ConversationAPI.sendMessageToConversation(convoId, message.trim());
      setConversation(res.conversation || null);
      setMessage("");
      setError("");
    } catch (e) {
      setError(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col h-80">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {title || "Chat"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = conversationId
                  ? await ConversationAPI.getById(conversationId)
                  : await ConversationAPI.getMineForStartup(startupId);
                setConversation(res.conversation || null);
                setError("");
              } catch (e) {
                setError(e.message || "Failed to refresh chat");
              }
            }}
            className="text-[10px] font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setPollingEnabled((v) => !v)}
            className="text-[10px] font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Auto-refresh every 5 seconds"
          >
            {pollingEnabled ? "Auto: ON" : "Auto: OFF"}
          </button>
          {loading && (
            <span className="text-[10px] text-gray-400">Loading…</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg mb-3 p-2 bg-gray-50">
        {error && (
          <p className="text-xs text-red-600 mb-1">{error}</p>
        )}
        {!conversation || !conversation.messages?.length ? (
          <p className="text-xs text-gray-500">
            No messages yet. Start the conversation.
          </p>
        ) : (
          conversation.messages.map((m, idx) => {
            const isSelf =
              currentUser && String(m.sender) === String(currentUser.id || currentUser._id);
            return (
              <div
                key={idx}
                className={`flex mb-1 ${isSelf ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`inline-block max-w-xs px-2 py-1 rounded-lg text-xs ${
                    isSelf
                      ? "bg-ayush-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <div>{m.text}</div>
                  <div className="mt-0.5 text-[9px] opacity-70">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ayush-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-ayush-600 text-white hover:bg-ayush-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}

