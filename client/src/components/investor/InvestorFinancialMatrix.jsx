import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaLeaf, FaHome, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { StartupAPI } from "../../api";
import FinancialMetricsSection from "../startup/FinancialMetricsSection";

export default function InvestorFinancialMatrix() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role !== "investor") {
      navigate("/user/dashboard", { replace: true });
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const s = await StartupAPI.get(id);
        if (!mounted) return;
        setStartup(s);
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
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ayush-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading financial matrix…</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100">
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
              <span className="ml-4 text-sm text-gray-500 hidden sm:inline">
                Investor Financial Matrix
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/investor/dashboard")}
                className="text-gray-700 hover:text-ayush-600 transition-colors flex items-center"
              >
                <FaHome className="mr-2" />
                Home
              </button>
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {startup.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Read-only financial dashboard for investors.
            </p>
          </div>
          <button
            onClick={() => navigate(`/investor/startups/${id}`)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-ayush-700"
          >
            <FaArrowLeft className="mr-2" />
            Back to Startup
          </button>
        </div>

        <FinancialMetricsSection
          startup={startup}
          editable={false}
          showReadOnlyExports
        />
      </div>
    </div>
  );
}

