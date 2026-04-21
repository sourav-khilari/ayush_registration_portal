import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaBell, FaHome, FaLeaf } from "react-icons/fa";
import { ConversationAPI } from "../../api";
import { useAuth } from "../../context/AuthContext";
import MeetingRequests from "./MeetingRequests";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      try {
        setLoading(true);
        const res = await ConversationAPI.listMine();
        const items = Array.isArray(res?.items) ? res.items : [];
        const me = String(user?.id || user?._id || "");
        const incoming = items.filter((item) => {
          const sender = String(item?.lastMessage?.sender || "");
          return Boolean(item?.lastMessage) && sender && sender !== me;
        });
        if (mounted) setNotifications(incoming);
      } catch {
        if (mounted) setNotifications([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (user) loadNotifications();
    return () => {
      mounted = false;
    };
  }, [user]);

  const openNotification = (item) => {
    const startupId = item?.startup?._id;
    if (!startupId) return;
    navigate(`/messages?conversationId=${encodeURIComponent(item._id)}`);
  };

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="container-page">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">AYUSH</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-gray-700 dark:text-gray-200 hover:text-ayush-600 transition-colors flex items-center"
              >
                <FaHome className="mr-2" />
                Home
              </Link>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="ui-card p-6 mb-6 fade-in-up">
          <div className="flex items-center mb-4">
            <FaBell className="text-ayush-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No new message notifications.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className="w-full text-left px-3 py-3 rounded-xl bg-ayush-50 hover:bg-ayush-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-ayush-100 dark:border-gray-700 hover-lift"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {user?.role === "investor"
                      ? `${item?.startup?.name || "Startup"} sent a new message`
                      : `New message from ${item?.otherParticipant?.name || item?.otherParticipant?.email || "Investor"}`}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                    {item?.lastMessage?.text || "Open chat"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {user?.role === "startup_owner" && (
          <div className="ui-card p-2">
            <MeetingRequests />
          </div>
        )}
      </div>
    </div>
  );
}

