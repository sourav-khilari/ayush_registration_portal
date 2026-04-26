import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { StartupAPI, UserAPI } from "../../api";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [startups, setStartups] = useState([]);
  const [govOfficials, setGovOfficials] = useState([]);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [govActionId, setGovActionId] = useState("");
  const [tab, setTab] = useState("overview"); // overview | users | startups | officials
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, activityRes, startupsRes, officialsRes] = await Promise.all([
        UserAPI.listAllUsersAdmin(),
        UserAPI.systemActivityAdmin(),
        StartupAPI.officialList({}),
        UserAPI.listGovOfficials(),
      ]);
      setUsers(Array.isArray(usersRes?.users) ? usersRes.users : []);
      setActivity(activityRes?.summary || null);
      setStartups(Array.isArray(startupsRes?.items) ? startupsRes.items : []);
      setGovOfficials(Array.isArray(officialsRes?.officials) ? officialsRes.officials : []);
    } catch (e) {
      setError(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/user/dashboard", { replace: true });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleDeleteUser(userId) {
    if (!window.confirm("Delete this user and related documents?")) return;
    setDeletingId(userId);
    try {
      await UserAPI.deleteUserAdmin(userId);
      await load();
    } catch (e) {
      setError(e.message || "Failed to delete user");
    } finally {
      setDeletingId("");
    }
  }

  async function handleGovAction(userId, action) {
    setGovActionId(userId);
    setError("");
    try {
      if (action === "approve") {
        await UserAPI.verifyGovOfficial(userId);
      } else {
        await UserAPI.rejectGovOfficial(userId);
      }
      await load();
    } catch (e) {
      setError(e.message || "Failed to update government official");
    } finally {
      setGovActionId("");
    }
  }

  const baseHttp = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE || "/api";
    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      return apiBase.replace(/\/api\/?$/, "");
    }
    return window.location.origin;
  }, []);

  const toAbsoluteUploadUrl = (maybePath) => {
    if (!maybePath) return "";
    const s = String(maybePath);
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `${baseHttp}${s.startsWith("/") ? "" : "/"}${s}`;
  };

  const startupStats = useMemo(() => {
    const stats = { approved: 0, rejected: 0, pending: 0, under_review: 0, inactive: 0 };
    for (const s of startups) {
      const k = String(s?.status || "pending");
      if (stats[k] != null) stats[k] += 1;
      else stats.pending += 1;
    }
    return stats;
  }, [startups]);

  const userByRole = useMemo(() => {
    const map = { startup_owner: [], investor: [], gov_official: [], admin: [], user: [] };
    for (const u of users) {
      const r = u?.role || "user";
      if (!map[r]) map[r] = [];
      map[r].push(u);
    }
    return map;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u?.name || "").toLowerCase();
      const email = String(u?.email || "").toLowerCase();
      const role = String(u?.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [users, query]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 shadow-lg sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ayush-600 to-green-600" />
            <div>
              <div className="font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
                AYUSH Admin Console
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Manage users, startups, and approvals
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-ghost text-sm">Home</Link>
            <button onClick={logout} className="btn-secondary text-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <section className="ui-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Overview of users, startups, and verification workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                Overview
              </TabButton>
              <TabButton active={tab === "startups"} onClick={() => setTab("startups")}>
                Startups
              </TabButton>
              <TabButton active={tab === "users"} onClick={() => setTab("users")}>
                Users
              </TabButton>
              <TabButton active={tab === "officials"} onClick={() => setTab("officials")}>
                Govt Officials
              </TabButton>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="mt-6 grid md:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={activity?.total_users ?? users.length} />
              <StatCard label="Startups (Approved)" value={startupStats.approved} tone="green" />
              <StatCard label="Startups (Rejected)" value={startupStats.rejected} tone="red" />
              <StatCard label="Gov Officials (Pending)" value={govOfficials.filter((o) => !o.role_verified).length} tone="yellow" />
            </div>
          )}
        </section>

        {tab === "startups" && (
          <section className="ui-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Startups</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  View which startups are approved, rejected, pending, or under review.
                </p>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-5 gap-3">
              <BadgeCard label="Approved" value={startupStats.approved} tone="green" />
              <BadgeCard label="Rejected" value={startupStats.rejected} tone="red" />
              <BadgeCard label="Pending" value={startupStats.pending} tone="yellow" />
              <BadgeCard label="Under Review" value={startupStats.under_review} tone="blue" />
              <BadgeCard label="Inactive" value={startupStats.inactive} tone="gray" />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2">Startup</th>
                    <th className="py-2">Founder</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Docs (V/P/R)</th>
                    <th className="py-2">Revenue</th>
                    <th className="py-2">Funding</th>
                  </tr>
                </thead>
                <tbody>
                  {startups.map((s) => (
                    <tr key={s._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.email}</div>
                      </td>
                      <td className="py-3">{s.founder_name || "�"}</td>
                      <td className="py-3">
                        <StatusPill value={s.status} />
                      </td>
                      <td className="py-3 text-xs">
                        <span className="text-green-700">V: {s.document_status_summary?.verified ?? 0}</span>{" "}
                        <span className="text-yellow-700">P: {s.document_status_summary?.pending ?? 0}</span>{" "}
                        <span className="text-red-700">R: {s.document_status_summary?.rejected ?? 0}</span>
                      </td>
                      <td className="py-3">{formatInr(s.revenue)}</td>
                      <td className="py-3">{formatInr(s.funding_raised)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "officials" && (
          <section className="ui-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Government Officials</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Approve or reject govt officials. View their uploaded documents.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {govOfficials.map((o) => (
                <div
                  key={o._id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/60 dark:bg-gray-900/40"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {o.name}{" "}
                        {o.role_verified ? (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Verified
                          </span>
                        ) : (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{o.email}</div>
                    </div>
                    <div className="flex gap-2">
                      {!o.role_verified && (
                        <button
                          disabled={govActionId === o._id}
                          onClick={() => handleGovAction(o._id, "approve")}
                          className="btn-primary"
                        >
                          {govActionId === o._id ? "Working..." : "Approve"}
                        </button>
                      )}
                      {o.role_verified && (
                        <button
                          disabled={govActionId === o._id}
                          onClick={() => handleGovAction(o._id, "reject")}
                          className="btn-secondary"
                        >
                          {govActionId === o._id ? "Working..." : "Reject"}
                        </button>
                      )}
                    </div>
                  </div>

                  {Array.isArray(o.verification_docs) && o.verification_docs.length > 0 && (
                    <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {o.verification_docs.map((d) => (
                        <a
                          key={d._id}
                          href={toAbsoluteUploadUrl(d.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                            {d.document_name || "Document"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Uploaded: {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "�"}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "users" && (
          <section className="ui-card p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  All users are shown together. Use search or review by role summary below.
                </p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users by name/email/role..."
                className="ui-input md:w-[360px]"
              />
            </div>

            <div className="mt-4 grid md:grid-cols-5 gap-3">
              <BadgeCard label="Startup Owners" value={userByRole.startup_owner.length} tone="blue" />
              <BadgeCard label="Investors" value={userByRole.investor.length} tone="green" />
              <BadgeCard label="Gov Officials" value={userByRole.gov_official.length} tone="yellow" />
              <BadgeCard label="Admins" value={userByRole.admin.length} tone="gray" />
              <BadgeCard label="Users" value={userByRole.user.length} tone="gray" />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2">User</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Role Verified</th>
                    <th className="py-2">Documents</th>
                    <th className="py-2">Last Login</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {u.name || "�"}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3">{u.role_verified ? "Yes" : "No"}</td>
                      <td className="py-3">
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {(Array.isArray(u.verification_docs) ? u.verification_docs.length : 0) || 0} docs
                        </div>
                        {Array.isArray(u.verification_docs) && u.verification_docs.length > 0 && (
                          <details className="mt-1">
                            <summary className="text-xs cursor-pointer text-ayush-700 dark:text-ayush-400">
                              View docs
                            </summary>
                            <div className="mt-2 grid sm:grid-cols-2 gap-2">
                              {u.verification_docs.map((d) => (
                                <a
                                  key={d._id}
                                  href={toAbsoluteUploadUrl(d.fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs px-2 py-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  {d.document_name || d.doc_category_declared || "Document"}
                                </a>
                              ))}
                            </div>
                          </details>
                        )}
                      </td>
                      <td className="py-3">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "�"}
                      </td>
                      <td className="py-3">
                        <button
                          disabled={deletingId === u._id}
                          onClick={() => handleDeleteUser(u._id)}
                          className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {deletingId === u._id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "overview" && (
          <section className="ui-card p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quick Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Recent signups and documents are shown below.
            </p>
            <div className="mt-6 grid lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Recent Users</div>
                <div className="mt-3 space-y-2">
                  {(activity?.recent_users || []).map((u) => (
                    <div key={u._id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {u.name}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "�"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Recent Documents</div>
                <div className="mt-3 space-y-2">
                  {(activity?.recent_documents || []).map((d) => (
                    <div key={d._id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                          {d.document_name || d.doc_category_declared || "Document"}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {d.uploaded_by?.email || "�"}
                        </div>
                      </div>
                      <div className="text-xs">
                        <StatusPill value={d.verified_status || "pending"} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "gray" }) {
  const cls =
    tone === "green"
      ? "from-green-50 to-green-100 text-green-700 border-green-200"
      : tone === "red"
        ? "from-red-50 to-red-100 text-red-700 border-red-200"
        : tone === "yellow"
          ? "from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200"
          : "from-gray-50 to-gray-100 text-gray-700 border-gray-200";
  return (
    <div className={`rounded-xl bg-gradient-to-br ${cls} p-4 border`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
        active
          ? "bg-ayush-600 text-white border-ayush-600"
          : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function BadgeCard({ label, value, tone = "gray" }) {
  const cls =
    tone === "green"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "red"
        ? "bg-red-50 text-red-700 border-red-200"
        : tone === "yellow"
          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
          : tone === "blue"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <div className={`rounded-xl border ${cls} p-3`}>
      <div className="text-xs font-semibold opacity-80">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "pending").toLowerCase();
  const cls =
    v === "approved" || v === "verified"
      ? "bg-green-100 text-green-700"
      : v === "rejected"
        ? "bg-red-100 text-red-700"
        : v === "under_review"
          ? "bg-blue-100 text-blue-700"
          : v === "inactive"
            ? "bg-gray-100 text-gray-700"
            : "bg-yellow-100 text-yellow-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{v.replace("_", " ")}</span>;
}

function formatInr(value) {
  const n = Number(value || 0);
  if (!n) return "?0";
  return `?${n.toLocaleString("en-IN")}`;
}

