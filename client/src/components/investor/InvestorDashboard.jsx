import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaLeaf,
  FaHome,
  FaSearch,
  FaFilter,
  FaChartLine,
  FaBuilding,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { StartupAPI, InvestmentAPI } from "../../api";

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [filters, setFilters] = useState({
    category: "",
    profitStatus: "",
    minRevenue: "",
    maxRevenue: "",
    location: "",
    q: "",
  });
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investmentSummary, setInvestmentSummary] = useState({
    totalInvested: 0,
    activeDeals: 0,
  });

  useEffect(() => {
    // Only allow investors to access this dashboard
    if (user && user.role !== "investor") {
      navigate("/user/dashboard", { replace: true });
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData(customFilters) {
    setLoading(true);
    setError("");
    try {
      const [startupRes, myInvestments] = await Promise.all([
        StartupAPI.investorList(customFilters || filters),
        InvestmentAPI.my().catch(() => ({ items: [] })), // tolerate if not yet implemented server-side
      ]);

      setStartups(startupRes.items || []);

      const items = myInvestments.items || [];
      const totalInvested = items.reduce(
        (sum, inv) => sum + (inv.amount || 0),
        0
      );
      const activeDeals = items.filter(
        (inv) => inv.status === "pending" || inv.status === "completed"
      ).length;
      setInvestmentSummary({
        totalInvested,
        activeDeals,
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load startups");
    } finally {
      setLoading(false);
    }
  }

  const totalStartups = startups.length;

  const formattedTotalInvested = useMemo(() => {
    if (!investmentSummary.totalInvested) return "₹0";
    const value = investmentSummary.totalInvested;
    if (value >= 1_00_00_000) {
      return `₹${(value / 1_00_00_000).toFixed(1)}Cr`;
    }
    if (value >= 1_00_000) {
      return `₹${(value / 1_00_000).toFixed(1)}L`;
    }
    return `₹${value.toLocaleString("en-IN")}`;
  }, [investmentSummary.totalInvested]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleApplyFilters(e) {
    if (e) e.preventDefault();
    loadData();
  }

  function handleClearFilters() {
    const cleared = {
      category: "",
      profitStatus: "",
      minRevenue: "",
      maxRevenue: "",
      location: "",
      q: "",
    };
    setFilters(cleared);
    loadData(cleared);
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-ayush-600 text-white rounded hover:bg-ayush-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100">
      {/* Top navigation */}
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
        {/* Header + summary cards */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Investor Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Discover approved AYUSH startups and track your investments.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Registered Startups"
              value={totalStartups}
              icon={<FaBuilding className="text-ayush-600" />}
            />
            <SummaryCard
              label="Total Invested"
              value={formattedTotalInvested}
              icon={<FaChartLine className="text-green-600" />}
            />
            <SummaryCard
              label="Active Deals"
              value={investmentSummary.activeDeals}
              icon={<FaFilter className="text-blue-600" />}
            />
          </div>
        </div>

        {/* Filters */}
        <form
          onSubmit={handleApplyFilters}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center mb-4 gap-2">
            <FaFilter className="text-ayush-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Filter Startups
            </h2>
          </div>
          <div className="grid md:grid-cols-5 gap-4 mb-4">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
            >
              <option value="">Category</option>
              <option value="ayurveda">Ayurveda</option>
              <option value="yoga">Yoga</option>
              <option value="unani">Unani</option>
              <option value="siddha">Siddha</option>
              <option value="homeopathy">Homeopathy</option>
              <option value="other">Other</option>
            </select>

            <select
              value={filters.profitStatus}
              onChange={(e) =>
                handleFilterChange("profitStatus", e.target.value)
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
            >
              <option value="">Profit / Loss</option>
              <option value="profit">Profit</option>
              <option value="loss">Loss</option>
              <option value="break_even">Break Even</option>
            </select>

            <input
              type="number"
              placeholder="Min Revenue"
              value={filters.minRevenue}
              onChange={(e) =>
                handleFilterChange("minRevenue", e.target.value)
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
            />
            <input
              type="number"
              placeholder="Max Revenue"
              value={filters.maxRevenue}
              onChange={(e) =>
                handleFilterChange("maxRevenue", e.target.value)
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayush-500"
            />

            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ayush-500">
              <FaMapMarkerAlt className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Location"
                value={filters.location}
                onChange={(e) =>
                  handleFilterChange("location", e.target.value)
                }
                className="flex-1 outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-2/3 flex items-center border border-gray-300 rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ayush-500 bg-gray-50">
              <FaSearch className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search by startup name"
                value={filters.q}
                onChange={(e) => handleFilterChange("q", e.target.value)}
                className="flex-1 outline-none bg-transparent"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                type="submit"
                className="flex-1 md:flex-none px-4 py-2 bg-ayush-600 text-white rounded-lg text-sm font-semibold hover:bg-ayush-700"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex-1 md:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </form>

        {/* Startup list */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Registered Startups
            </h2>
            {loading && (
              <span className="text-sm text-gray-500">Loading data…</span>
            )}
          </div>

          {startups.length === 0 && !loading ? (
            <div className="p-6 text-center text-gray-500">
              No startups found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Startup</Th>
                    <Th>Category</Th>
                    <Th>Location</Th>
                    <Th>Revenue</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {startups.map((s) => (
                    <tr key={s._id} className="hover:bg-ayush-50/50">
                      <Td>
                        <div className="font-semibold text-gray-900">
                          {s.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Founder: {s.founder_name}
                        </div>
                      </Td>
                      <Td className="capitalize">
                        {s.startup_type || "—"}
                      </Td>
                      <Td className="flex items-center text-gray-700">
                        <FaMapMarkerAlt className="mr-1 text-gray-400" />
                        <span>{s.location || "N/A"}</span>
                      </Td>
                      <Td>{formatRevenue(s.revenue)}</Td>
                      <Td>
                        <StatusPill status={s.financial_status} />
                      </Td>
                      <Td>
                        <button
                          onClick={() =>
                            navigate(`/investor/startups/${s._id}`)
                          }
                          className="px-4 py-2 text-sm font-semibold bg-ayush-600 text-white rounded-lg hover:bg-ayush-700"
                        >
                          View Details
                        </button>
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

function SummaryCard({ label, value, icon }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-ayush-50 to-green-50 border border-ayush-100">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {label}
        </div>
        <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
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

function Td({ children, className = "" }) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm ${className}`}>
      {children}
    </td>
  );
}

function StatusPill({ status }) {
  if (!status) {
    return (
      <span className="inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
        N/A
      </span>
    );
  }
  let colorClasses = "bg-gray-100 text-gray-700";
  if (status === "profit") colorClasses = "bg-green-100 text-green-700";
  if (status === "loss") colorClasses = "bg-red-100 text-red-700";
  if (status === "break_even") colorClasses = "bg-yellow-100 text-yellow-700";

  const label =
    status === "break_even"
      ? "Break Even"
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colorClasses}`}
    >
      {label}
    </span>
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

