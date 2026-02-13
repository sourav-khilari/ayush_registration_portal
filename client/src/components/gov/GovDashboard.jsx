import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaExternalLinkAlt } from "react-icons/fa";
import {
  FaLeaf,
  FaHome,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { StartupAPI, UserAPI } from "../../api";
import { FaUserCheck, FaUserTimes, FaUserClock } from "react-icons/fa";

const STATUS_LABELS = {
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  inactive: "Inactive",
};

export default function GovDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  
  // Admin section: Government officials verification
  const [showVerifySection, setShowVerifySection] = useState(false);
  const [govOfficials, setGovOfficials] = useState([]);
  const [loadingOfficials, setLoadingOfficials] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => {
    // Only verified government officials or admins should use this page.
    if (user && user.role !== "gov_official" && user.role !== "admin") {
      navigate("/user/dashboard", { replace: true });
      return;
    }
    // Check if gov_official is verified
    if (user?.role === "gov_official" && !user?.role_verified && user?.role !== "admin") {
      // Don't navigate away, but show error message
      setError("You need to be verified by an admin to access startup approvals. Please contact an administrator.");
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, query]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await StartupAPI.officialList({
        status: statusFilter || undefined,
        q: query || undefined,
      });
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load startups");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id, status) {
    setUpdatingId(id);
    setError("");
    try {
      await StartupAPI.updateStatusByOfficial(id, status);
      // Refresh list after status change
      await load();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  // Admin: Load government officials for verification
  async function loadGovOfficials() {
    if (user?.role !== "admin") return;
    setLoadingOfficials(true);
    try {
      const res = await UserAPI.listGovOfficials();
      setGovOfficials(res.officials || []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load government officials");
    } finally {
      setLoadingOfficials(false);
    }
  }

  // Admin: Verify a government official
  async function handleVerifyOfficial(userId) {
    setVerifyingId(userId);
    setError("");
    try {
      await UserAPI.verifyGovOfficial(userId);
      await loadGovOfficials(); // Refresh list
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to verify official");
    } finally {
      setVerifyingId(null);
    }
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
              <span className="ml-4 text-sm text-gray-500 hidden sm:inline">
                Government Dashboard
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-gray-700 hover:text-ayush-600 transition-colors flex items-center"
              >
                <FaHome className="mr-2" />
                Home
              </Link>
              <div className="hidden sm:block text-gray-700">
                {user ? `Welcome, ${user.name}` : "Welcome"}
              </div>
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

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Section: Verify Government Officials */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Admin Panel - Verify Government Officials
                </h1>
                <p className="text-gray-600">
                  Verify government officials to grant them access to approve/reject startups.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVerifySection(!showVerifySection);
                  if (!showVerifySection) {
                    loadGovOfficials();
                  }
                }}
                className="px-4 py-2 bg-ayush-600 text-white rounded-lg hover:bg-ayush-700 transition-colors"
              >
                {showVerifySection ? "Hide" : "Show"} Verification Panel
              </button>
            </div>

            {showVerifySection && (
              <div className="mt-6">
                {loadingOfficials ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ayush-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading officials...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {govOfficials.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No government officials found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50">
                            <tr>
                              <Th>Name</Th>
                              <Th>Email</Th>
                              <Th>Status</Th>
                              <Th>Registered</Th>
                              <Th>Actions</Th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {govOfficials.map((official) => (
                              <tr key={official._id}>
                                <Td className="font-medium">{official.name}</Td>
                                <Td>{official.email}</Td>
                                <Td>
                                  {official.role_verified ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <FaUserCheck className="mr-1" />
                                      Verified
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <FaUserClock className="mr-1" />
                                      Pending Verification
                                    </span>
                                  )}
                                </Td>
                                <Td>
                                  {official.createdAt
                                    ? new Date(official.createdAt).toLocaleDateString()
                                    : "—"}
                                </Td>
                                <Td>
                                  {!official.role_verified && (
                                    <button
                                      onClick={() => handleVerifyOfficial(official._id)}
                                      disabled={verifyingId === official._id}
                                      className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                                    >
                                      <FaUserCheck className="mr-1" />
                                      {verifyingId === official._id ? "Verifying..." : "Verify"}
                                    </button>
                                  )}
                                  {official.role_verified && (
                                    <span className="text-xs text-gray-500">Already verified</span>
                                  )}
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Startup Approvals
          </h1>
          <p className="text-gray-600">
            Review newly submitted AYUSH startups and update their status.
          </p>

          <div className="mt-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="w-full md:w-1/2 flex items-center border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus-within:ring-2 focus-within:ring-ayush-500">
              <FaSearch className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search by startup name, founder, email or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-2">
            {error}
            {user?.role === "gov_official" && !user?.role_verified && (
              <div className="mt-2 text-xs">
                <strong>Note:</strong> An admin needs to verify your account. If you are an admin, please log in with admin credentials to verify government officials.
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Startups ({items.length})
            </h2>
            {loading && (
              <span className="text-sm text-gray-500">Loading data…</span>
            )}
          </div>

          {items.length === 0 && !loading ? (
            <div className="p-6 text-center text-gray-500">
              No startups found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Name</Th>
                    <Th>Founder</Th>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Submitted</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {items.map((s) => (
                    <tr key={s._id}>
                      <Td>
                        <div className="font-semibold text-gray-900">
                          {s.name}
                        </div>
                        <div className="text-xs text-gray-500">{s.email}</div>
                      </Td>
                      <Td>{s.founder_name}</Td>
                      <Td className="capitalize">{s.startup_type || "—"}</Td>
                      <Td>
                        <StatusBadge value={s.status} />
                      </Td>
                      <Td>
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString()
                          : "—"}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Link
                            to={`/gov/startups/${s._id}`}
                            className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-ayush-100 text-ayush-700 hover:bg-ayush-200"
                          >
                            <FaExternalLinkAlt className="mr-1" />
                            View & Docs
                          </Link>
                          {(s.status === "pending" ||
                            s.status === "under_review") && (
                            <>
                              <button
                                disabled={updatingId === s._id}
                                onClick={() =>
                                  changeStatus(s._id, "approved")
                                }
                                className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                              >
                                <FaCheckCircle className="mr-1" />
                                Approve
                              </button>
                              <button
                                disabled={updatingId === s._id}
                                onClick={() =>
                                  changeStatus(s._id, "rejected")
                                }
                                className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                <FaTimesCircle className="mr-1" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      scope="col"
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
      {children}
    </td>
  );
}

function StatusBadge({ value }) {
  const label = STATUS_LABELS[value] || value || "Unknown";
  let classes = "bg-gray-100 text-gray-700";
  if (value === "pending") classes = "bg-yellow-100 text-yellow-800";
  if (value === "under_review") classes = "bg-blue-100 text-blue-800";
  if (value === "approved") classes = "bg-green-100 text-green-800";
  if (value === "rejected") classes = "bg-red-100 text-red-800";

  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

