import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  FaBell,
  FaCalendarAlt,
  FaCircle,
  FaHome,
  FaPaperclip,
  FaPaperPlane,
  FaSearch,
  FaSmile,
} from "react-icons/fa";
import { ConversationAPI } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { sendRequest } from "../../api/meetApi";
import { acceptRequest, rejectRequest } from "../../api/meetApi";

const MEET_PREFIX = "__MEET_REQ__:";
const getMeetingRequestId = (text) =>
  String(text || "").startsWith(MEET_PREFIX)
    ? String(text).slice(MEET_PREFIX.length).split("|")[0]
    : "";

const QUICK_EMOJIS = [":)", ":D", "<3", ":+1:", ":rocket:", ":idea:"];

export default function MessagesWorkspace() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [typingMap, setTypingMap] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingSlots, setMeetingSlots] = useState(["", "", ""]);
  const [sendingMeeting, setSendingMeeting] = useState(false);
  const [meetingActionLoading, setMeetingActionLoading] = useState({});
  const [resolvedMeetingRequests, setResolvedMeetingRequests] = useState({});
  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  const myId = String(user?.id || user?._id || "");
  const activeConversationId = searchParams.get("conversationId");

  const baseHttp = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE || "/api";
    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      return apiBase.replace(/\/api\/?$/, "");
    }
    return window.location.origin;
  }, []);

  async function loadConversations(query = "") {
    const res = await ConversationAPI.listMine(
      query ? { q: query } : undefined,
    );
    setConversations(Array.isArray(res?.items) ? res.items : []);
  }

  useEffect(() => {
    loadConversations(search).catch((e) =>
      setError(e.message || "Failed to load chats"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      loadConversations(search).catch(() => void 0);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const socket = io(baseHttp, { path: "/socket.io", auth: { token } });
    socketRef.current = socket;
    socket.emit("presence:list");

    socket.on("presence:list", ({ users }) => {
      setOnlineUsers(new Set(users || []));
    });
    socket.on("presence:update", ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(Array.from(prev));
        if (online) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
    });
    socket.on("chat:typing", ({ conversationId, userId, typing }) => {
      if (String(userId) === myId) return;
      setTypingMap((prev) => ({ ...prev, [conversationId]: Boolean(typing) }));
    });
    socket.on("chat:new_message", ({ conversationId, message: incoming }) => {
      setConversations((prev) =>
        prev.map((c) =>
          String(c._id) === String(conversationId)
            ? { ...c, lastMessage: incoming }
            : c,
        ),
      );
      setActive((prev) => {
        if (!prev || String(prev._id) !== String(conversationId)) return prev;
        const exists = (prev.messages || []).some(
          (m) => String(m._id) === String(incoming?._id),
        );
        if (exists) return prev;
        return { ...prev, messages: [...(prev.messages || []), incoming] };
      });
    });
    socket.on("chat:sidebar_refresh", () => {
      loadConversations(search).catch(() => void 0);
    });
    socket.on("chat:seen", ({ conversationId, seenBy }) => {
      if (String(seenBy) === myId) return;
      setActive((prev) => {
        if (!prev || String(prev._id) !== String(conversationId)) return prev;
        const messages = (prev.messages || []).map((m) => ({
          ...m,
          seenBy: Array.from(new Set([...(m.seenBy || []), seenBy])),
        }));
        return { ...prev, messages };
      });
    });

    return () => socket.disconnect();
  }, [baseHttp, myId, search]);

  useEffect(() => {
    if (!activeConversationId) return;
    const exists = conversations.find(
      (c) => String(c._id) === String(activeConversationId),
    );
    if (exists) {
      openConversation(activeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, conversations.length]);

  useEffect(() => {
    if (activeConversationId) return;
    if (!active && conversations.length > 0) {
      openConversation(conversations[0]._id).catch(() => void 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, conversations, active]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages?.length, typingMap, active?._id]);

  async function openConversation(conversationId) {
    const res = await ConversationAPI.getById(conversationId);
    const convo = res?.conversation || null;
    setActive(convo);
    if (convo?._id) {
      socketRef.current?.emit("conversation:join", {
        conversationId: convo._id,
      });
      await ConversationAPI.markSeen(convo._id).catch(() => void 0);
      await loadConversations(search).catch(() => void 0);
      setSearchParams({ conversationId: convo._id });
    }
  }

  async function sendNow(attachment = null) {
    if (!active?._id) return;
    const text = message.trim();
    if (!text && !attachment) return;
    const res = await ConversationAPI.sendMessageToConversation(
      active._id,
      text,
      attachment,
    );
    setActive(res?.conversation || active);
    setMessage("");
    setShowEmoji(false);
    socketRef.current?.emit("chat:typing", {
      conversationId: active._id,
      typing: false,
    });
  }

  async function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file || !active?._id) return;
    try {
      setUploading(true);
      const up = await ConversationAPI.uploadAttachment(file);
      await sendNow(up?.attachment || null);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const activeMeta = useMemo(() => {
    const sidebarItem = conversations.find(
      (c) => String(c._id) === String(active?._id),
    );
    const other = sidebarItem?.otherParticipant;
    return {
      name: other?.name || other?.email || "Participant",
      role: other?.role || "",
      online: onlineUsers.has(String(other?._id || "")),
      blockedByMe: Boolean(sidebarItem?.blockedByMe),
    };
  }, [active?._id, conversations, onlineUsers]);

  async function handleScheduleMeeting() {
    if (!active?._id || !token) return;
    const sidebarItem = conversations.find(
      (c) => String(c._id) === String(active._id),
    );
    const startupId = sidebarItem?.startup?._id;
    const receiverId = sidebarItem?.otherParticipant?._id;
    const slots = meetingSlots.filter(Boolean);
    if (!startupId || !receiverId || slots.length === 0) {
      setError("Please choose at least one meeting slot.");
      return;
    }
    try {
      setSendingMeeting(true);
      const res = await sendRequest(
        {
          receiverId,
          startupId,
          title:
            meetingTitle ||
            `Meeting for ${sidebarItem?.startup?.name || "startup"}`,
          proposed_slots: slots,
          duration_minutes: 30,
          timezone: "Asia/Kolkata",
        },
        token,
      );
      const requestId = res?.data?._id;
      // Post a "meeting request card" message into chat
      if (requestId) {
        const encoded = `${MEET_PREFIX}${requestId}|${encodeURIComponent(
          meetingTitle ||
            `Meeting for ${sidebarItem?.startup?.name || "startup"}`,
        )}|${slots.map((s) => encodeURIComponent(s)).join(",")}`;
        await ConversationAPI.sendMessageToConversation(active._id, encoded);
      }
      setMeetingTitle("");
      setMeetingSlots(["", "", ""]);
      setMessage(
        (m) =>
          `${m}${m ? " " : ""}Meeting request sent. Please check proposed slots.`,
      );
    } catch (e) {
      setError(e?.message || "Failed to send meeting request");
    } finally {
      setSendingMeeting(false);
    }
  }

  async function handleMeetingAction(meetingText, action, slotIndex) {
    if (!active?._id || !token) return;
    const parts = String(meetingText || "")
      .slice(MEET_PREFIX.length)
      .split("|");
    const requestId = parts[0];
    const title = decodeURIComponent(parts[1] || "Meeting");
    if (!requestId) return;
    if (meetingActionLoading[requestId] || resolvedMeetingRequests[requestId]) return;
    try {
      setMeetingActionLoading((prev) => ({ ...prev, [requestId]: true }));
      if (action === "accept") {
        const res = await acceptRequest(requestId, slotIndex, token);
        const link =
          res?.data?.google_meet_link ||
          res?.data?.googleMeetLink ||
          "https://meet.google.com/new";
        await ConversationAPI.sendMessageToConversation(
          active._id,
          `Meeting accepted: ${title}\nJoin link: ${link}\nInvitation email has been sent.`,
        );
        setResolvedMeetingRequests((prev) => ({ ...prev, [requestId]: "accepted" }));
      } else {
        await rejectRequest(requestId, token);
        await ConversationAPI.sendMessageToConversation(
          active._id,
          `? Meeting rejected: ${title}`,
        );
        setResolvedMeetingRequests((prev) => ({ ...prev, [requestId]: "rejected" }));
      }
    } catch (e) {
      setError(e?.message || "Meeting action failed");
    } finally {
      setMeetingActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="container-page h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBell className="text-ayush-600" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Messages
            </span>
          </div>
          <Link to="/" className="btn-ghost">
            <FaHome className="mr-2" /> Home
          </Link>
        </div>
      </nav>

      <div className="container-page py-6">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-150px)]">
          <aside className="ui-card p-3 flex flex-col">
            <div className="relative mb-3">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search startups, investors..."
                className="ui-input pl-9"
              />
            </div>
            <div className="overflow-y-auto space-y-2">
              {conversations.map((c) => {
                const other = c.otherParticipant;
                const selected = String(c._id) === String(active?._id);
                const online = onlineUsers.has(String(other?._id || ""));
                return (
                  <button
                    key={c._id}
                    onClick={() => openConversation(c._id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selected
                        ? "border-ayush-500 bg-ayush-50 dark:bg-gray-800"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {c.startup?.name || "Startup"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="status-pill bg-red-600 text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {other?.name || other?.email}{" "}
                      {online ? "� online" : "� offline"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-1">
                      {c.lastMessage?.text ||
                        c.lastMessage?.attachment?.name ||
                        "No messages yet"}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="ui-card flex flex-col overflow-hidden">
            {!active ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                Select a conversation to start chatting
              </div>
            ) : (
              <>
                <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {activeMeta.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <FaCircle
                        className={`mr-1 ${activeMeta.online ? "text-green-500" : "text-gray-400"}`}
                      />
                      {activeMeta.role || "user"}{" "}
                      {activeMeta.online ? "online" : "offline"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        ConversationAPI.report(
                          active._id,
                          "Inappropriate behavior",
                        )
                      }
                    >
                      Report
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={async () => {
                        await ConversationAPI.toggleBlock(
                          active._id,
                          !activeMeta.blockedByMe,
                        );
                        await loadConversations(search);
                      }}
                    >
                      {activeMeta.blockedByMe ? "Unblock" : "Block"}
                    </button>
                  </div>
                </header>

                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50/60 dark:bg-gray-900/40"
                >
                  {(active.messages || []).map((m) => {
                    const isSelf = String(m.sender) === myId;
                    const seen = (m.seenBy || []).some(
                      (id) => String(id) !== myId,
                    );
                    const isMeetCard = String(m.text || "").startsWith(
                      MEET_PREFIX,
                    );
                    return (
                      <div
                        key={m._id || `${m.sender}-${m.createdAt}`}
                        className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isSelf ? "bg-ayush-600 text-white rounded-br-md" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md"}`}
                        >
                          {isMeetCard ? (
                            (() => {
                              const requestId = getMeetingRequestId(m.text);
                              const disabled =
                                !!meetingActionLoading[requestId] ||
                                !!resolvedMeetingRequests[requestId];
                              return (
                            <MeetingCard
                              text={m.text}
                              canRespond={!isSelf && !disabled}
                              actionDisabled={disabled}
                              actionState={resolvedMeetingRequests[requestId] || null}
                              onAccept={(idx) =>
                                handleMeetingAction(m.text, "accept", idx)
                              }
                              onReject={() =>
                                handleMeetingAction(m.text, "reject", 0)
                              }
                            />
                              );
                            })()
                          ) : m.text ? (
                            <p className="whitespace-pre-wrap">{m.text}</p>
                          ) : null}
                          {m.attachment?.url ? (
                            <a
                              href={`${baseHttp}${m.attachment.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-1 inline-block underline ${isSelf ? "text-white" : "text-ayush-600"}`}
                            >
                              {m.attachment.name || "Attachment"}
                            </a>
                          ) : null}
                          <p
                            className={`mt-1 text-[10px] ${isSelf ? "text-white/80" : "text-gray-500"}`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString()}{" "}
                            {isSelf ? (seen ? " � Seen" : " � Sent") : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {typingMap[active._id] && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Typing...
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 p-3">
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary px-3"
                      onClick={() =>
                        setMessage(
                          (m) => `${m}${m ? " " : ""}Interested in investing`,
                        )
                      }
                    >
                      Interested
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-3"
                      onClick={handleScheduleMeeting}
                      disabled={sendingMeeting}
                    >
                      <FaCalendarAlt className="mr-2" />
                      {sendingMeeting ? "Scheduling..." : "Schedule Meeting"}
                    </button>
                  </div>
                  <div className="mb-2 grid md:grid-cols-4 gap-2">
                    <input
                      className="ui-input md:col-span-1"
                      placeholder="Meeting title"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                    />
                    {meetingSlots.map((slot, idx) => (
                      <input
                        key={idx}
                        type="datetime-local"
                        className="ui-input"
                        value={slot}
                        onChange={(e) =>
                          setMeetingSlots((prev) => {
                            const next = [...prev];
                            next[idx] = e.target.value;
                            return next;
                          })
                        }
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-secondary px-3"
                      type="button"
                      onClick={() => setShowEmoji((s) => !s)}
                    >
                      <FaSmile />
                    </button>
                    <label className="btn-secondary px-3 cursor-pointer">
                      <FaPaperclip />
                      <input
                        type="file"
                        className="hidden"
                        onChange={onFileSelected}
                      />
                    </label>
                    <input
                      className="ui-input"
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        socketRef.current?.emit("chat:typing", {
                          conversationId: active._id,
                          typing: e.target.value.length > 0,
                        });
                      }}
                      placeholder={
                        uploading ? "Uploading file..." : "Type a message"
                      }
                    />
                    <button
                      className="btn-primary px-4"
                      type="button"
                      onClick={() => sendNow()}
                    >
                      <FaPaperPlane />
                    </button>
                  </div>
                  {showEmoji && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="btn-secondary px-2 py-1"
                          onClick={() => setMessage((m) => `${m}${e}`)}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MeetingCard({
  text,
  canRespond,
  onAccept,
  onReject,
  actionDisabled = false,
  actionState = null,
}) {
  const raw = String(text || "");
  const parts = raw.replace(MEET_PREFIX, "").split("|");
  const requestId = parts[0] || "";
  const title = decodeURIComponent(parts[1] || "Meeting");
  const slots = (parts[2] || "")
    .split(",")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Meeting Request</p>
      <p className="text-xs opacity-80">ID: {requestId}</p>
      <p className="text-sm">{title}</p>
      <div className="space-y-1">
        {slots.map((s, idx) => (
          <div key={idx} className="text-xs opacity-90">
            {idx + 1}. {new Date(s).toLocaleString()}
          </div>
        ))}
      </div>
      {canRespond && slots.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {slots.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-secondary px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={actionDisabled}
              onClick={() => onAccept(idx)}
            >
              Accept slot {idx + 1}
            </button>
          ))}
          <button
            type="button"
            className="btn-secondary px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={actionDisabled}
            onClick={onReject}
          >
            Reject
          </button>
        </div>
      )}
      {actionState && (
        <p className="text-xs opacity-80">
          {actionState === "accepted" ? "Slot accepted" : "Request rejected"}
        </p>
      )}
    </div>
  );
}
