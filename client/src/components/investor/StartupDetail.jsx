import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  FaLeaf,
  FaHome,
  FaMapMarkerAlt,
  FaGlobe,
  FaEnvelope,
  FaPhone,
  FaChartLine,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { DocumentAPI, InvestmentAPI, StartupAPI } from "../../api";

export default function StartupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [startup, setStartup] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getDocumentUrl = (doc) => {
    if (!doc?.fileUrl) return null;
    const apiBase = import.meta.env.VITE_API_BASE || "";
    const uploadBase = apiBase.replace(/\/api\/?$/, "") || window.location.origin;
    return `${uploadBase}${doc.fileUrl.startsWith("/") ? "" : "/"}${doc.fileUrl}`;
  };

  const [investmentForm, setInvestmentForm] = useState({
    amount: "",
    stake_percentage: "",
    investment_type: "",
  });
  const [investing, setInvesting] = useState(false);
  const [investMessage, setInvestMessage] = useState("");

  useEffect(() => {
    // Restrict access: only investors can view this page
    if (user && user.role !== "investor") {
      navigate("/user/dashboard", { replace: true });
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [s, docRes] = await Promise.all([
          StartupAPI.get(id),
          DocumentAPI.list({ startup_id: id }).catch(() => ({ items: [] })),
        ]);
        if (!mounted) return;
        setStartup(s);
        setDocuments(docRes.items || docRes.documents || []);
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load startup");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function handleInvest(e) {
    e.preventDefault();
    setInvestMessage("");

    const amount = Number(investmentForm.amount);
    if (!amount || amount <= 0) {
      setInvestMessage("Please enter a valid amount.");
      return;
    }

    try {
      setInvesting(true);
      const payload = {
        startup_id: id,
        amount,
      };
      if (investmentForm.stake_percentage) {
        payload.stake_percentage = Number(investmentForm.stake_percentage);
      }
      if (investmentForm.investment_type) {
        payload.investment_type = investmentForm.investment_type;
      }
      const res = await InvestmentAPI.create(payload);
      setInvestMessage(res.message || "Investment submitted successfully.");
    } catch (e) {
      console.error(e);
      setInvestMessage(e.message || "Failed to create investment.");
    } finally {
      setInvesting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ayush-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading startup details…</p>
        </div>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">
            {error || "Startup not found or inaccessible."}
          </p>
          <button
            onClick={() => navigate("/investor/dashboard")}
            className="px-4 py-2 bg-ayush-600 text-white rounded hover:bg-ayush-700"
          >
            Back to Investor Dashboard
          </button>
        </div>
      </div>
    );
  }

  const revenueHistory = startup.revenue_history || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100">
      {/* Top nav */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
              <span className="ml-4 text-sm text-gray-500 hidden sm:inline">
                Investor Portal
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
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {startup.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {startup.startup_type && (
                  <span className="px-3 py-1 rounded-full bg-ayush-50 text-ayush-700 text-xs font-semibold uppercase tracking-wide">
                    {startup.startup_type}
                  </span>
                )}
                {startup.status && (
                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold uppercase tracking-wide">
                    {startup.status.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Latest Revenue</div>
              <div className="text-xl font-bold text-gray-900">
                {formatRevenue(startup.revenue)}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center justify-end">
                <FaMapMarkerAlt className="mr-1 text-gray-400" />
                <span>{startup.location || startup.address || "Location N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Company details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Company Overview
              </h2>
              <p className="text-gray-700 mb-3">
                {startup.description || "No description provided."}
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <InfoMetric label="Financial Status">
                  {startup.financial_status
                    ? startup.financial_status.replace("_", " ")
                    : "Not specified"}
                </InfoMetric>
                <InfoMetric label="Website">
                  {startup.website ? (
                    <a
                      href={startup.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-ayush-600 hover:text-ayush-700"
                    >
                      <FaGlobe className="mr-1" />
                      Visit
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </InfoMetric>
                <InfoMetric label="Tags">
                  {startup.tags && startup.tags.length > 0
                    ? startup.tags.join(", ")
                    : "None"}
                </InfoMetric>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Contact Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <InfoRow
                  icon={<FaEnvelope className="text-ayush-600" />}
                  label="Email"
                  value={startup.email}
                />
                <InfoRow
                  icon={<FaPhone className="text-ayush-600" />}
                  label="Phone"
                  value={startup.phone_number || "Not provided"}
                />
                <InfoRow
                  icon={<FaMapMarkerAlt className="text-ayush-600" />}
                  label="Address"
                  value={startup.address || "Not provided"}
                />
                <InfoRow
                  icon={<FaGlobe className="text-ayush-600" />}
                  label="Website"
                  value={startup.website || "Not provided"}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Documents
              </h2>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No documents are available for this startup.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {documents.map((doc) => {
                    const docUrl = getDocumentUrl(doc);
                    return (
                      <li
                        key={doc._id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {doc.document_name || doc.filename || "Document"}
                          </div>
                          {doc.doc_category_declared && (
                            <div className="text-xs text-gray-500">
                              {doc.doc_category_declared.replace("_", " ")}
                            </div>
                          )}
                        </div>
                        {docUrl && (
                          <div className="flex gap-2">
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-ayush-50 text-ayush-700 hover:bg-ayush-100"
                            >
                              View
                            </a>
                            <a
                              href={docUrl}
                              download={(doc.document_name || doc.filename || "document").split("/").pop()}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Financial chart + Invest card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Revenue Trend
                </h2>
                <FaChartLine className="text-ayush-600" />
              </div>
              {revenueHistory.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No revenue history available.
                </p>
              ) : (
                <SimpleBarChart data={revenueHistory} />
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Invest in this Startup
              </h2>
              <form onSubmit={handleInvest} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={investmentForm.amount}
                    onChange={(e) =>
                      setInvestmentForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Stake Percentage (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={investmentForm.stake_percentage}
                    onChange={(e) =>
                      setInvestmentForm((prev) => ({
                        ...prev,
                        stake_percentage: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Investment Type (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Equity, Debt, Grant, etc."
                    value={investmentForm.investment_type}
                    onChange={(e) =>
                      setInvestmentForm((prev) => ({
                        ...prev,
                        investment_type: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={investing}
                  className="w-full mt-2 bg-ayush-600 hover:bg-ayush-700 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-60"
                >
                  {investing ? "Submitting..." : "Invest Now"}
                </button>
                {investMessage && (
                  <p className="text-xs text-gray-700 mt-2">{investMessage}</p>
                )}
              </form>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/investor/dashboard")}
          className="inline-flex items-center text-sm text-gray-600 hover:text-ayush-700"
        >
          ← Back to Investor Dashboard
        </button>
      </div>
    </div>
  );
}

function InfoMetric({ label, children }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <div className="text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-gray-900">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1">{icon}</div>
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-sm text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function SimpleBarChart({ data }) {
  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value || 0)) || 1;

  return (
    <div className="space-y-2">
      {data
        .slice()
        .sort((a, b) => (a.year || 0) - (b.year || 0))
        .map((d) => {
          const ratio = (d.value || 0) / maxValue;
          const width = `${Math.max(ratio * 100, 5)}%`;
          return (
            <div key={d.year} className="flex items-center gap-2">
              <div className="w-10 text-xs text-gray-500">{d.year}</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ayush-500 to-green-500"
                  style={{ width }}
                />
              </div>
              <div className="w-16 text-xs text-gray-600 text-right">
                {formatRevenue(d.value)}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function formatRevenue(value) {
  if (value == null) return "N/A";
  if (value >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(1)}Cr`;
  }
  if (value >= 1_00_000) {
    return `₹${(value / 1_00_000).toFixed(1)}L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

