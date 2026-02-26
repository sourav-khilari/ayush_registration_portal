// src/components/StartupDashboard.jsx
/**
 * StartupDashboard Component
 * Main dashboard page displaying startup metrics, KPIs, charts, and profile information.
 * Fetches data from /api/dashboard endpoint and displays it with interactive visualizations.
 * 
 * Features:
 * - Two view modes: "startup" (default, full view) and "investor" (read-only, investor-safe)
 * - Mode detection from query params: ?mode=investor
 * - Real-time KPI cards (Revenue, Users, Growth, Paying Customers)
 * - Dual-axis revenue vs users chart
 * - Startup profile snapshot with attraction score (hidden in investor mode)
 * - Team information display
 * - Market opportunity description
 * - Error handling and loading states
 * - Responsive design
 * 
 * Usage:
 * - Startup view: /dashboard or /dashboard?mode=startup
 * - Investor view: /dashboard?mode=investor
 */

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import { getDashboard } from "../api/dashboard";
import { StartupAPI } from "../api";
import KPICards from "../features/dashboard/KPICards";
import RevenueUsersChart from "../features/dashboard/RevenueUsersChart";
import StrengthCharts from "../features/dashboard/StrengthCharts";
import GrowthInsights from "../features/dashboard/GrowthInsights";
import UnitEconomics from "../features/dashboard/UnitEconomics";
import ProfileForm from "../features/dashboard/ProfileForm";
import MetricsForm from "../features/dashboard/MetricsForm";
import MetricsHistory from "../features/dashboard/MetricsHistory";
import styles from "./StartupDashboard.module.css";

const StartupDashboard = ({ startupId }) => {
  const [searchParams] = useSearchParams();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvedStartupId, setResolvedStartupId] = useState(startupId || null);
  const [startupIdLoading, setStartupIdLoading] = useState(!startupId);
  
  // Get mode from query params, default to "startup"
  const mode = searchParams.get("mode") || "startup";

  useEffect(() => {
    if (startupId) return;

    let mounted = true;
    (async () => {
      try {
        const res = await StartupAPI.mine();
        const first = Array.isArray(res?.startups) ? res.startups[0] : null;
        if (!mounted) return;
        setResolvedStartupId(first?._id || first?.id || null);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load startup");
      } finally {
        if (mounted) setStartupIdLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [startupId]);

  useEffect(() => {
    if (!resolvedStartupId) return;
    fetchDashboardData();
  }, [resolvedStartupId, mode]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pass mode as role to API
      const response = await getDashboard(resolvedStartupId, mode);

      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.error || "Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError(
        err.response?.data?.error || "Error fetching dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle profile save - re-fetch dashboard data
  const handleProfileSave = () => {
    fetchDashboardData();
  };

  if (startupIdLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}>
            <div className={styles.spinnerRing}></div>
          </div>
          <p className={styles.loadingText}>Loading startup...</p>
          <p className={styles.loadingSubtext}>Please wait while we prepare your dashboard</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}>
            <div className={styles.spinnerRing}></div>
          </div>
          <p className={styles.loadingText}>Loading dashboard...</p>
          <p className={styles.loadingSubtext}>Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className={styles.errorTitle}>Error Loading Dashboard</h2>
          <p className={styles.errorMessage}>{error}</p>
          {/* Retry button only in startup mode */}
          {mode === "startup" && (
            <button
              onClick={fetchDashboardData}
              className={styles.errorButton}
            >
              Try Again
            </button>
          )}
          <p className={styles.errorSupport}>
            If the problem persists, please contact support.
          </p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <p className={styles.loadingText}>No dashboard data available</p>
          {/* Reload button only in startup mode */}
          {mode === "startup" && (
            <button
              onClick={fetchDashboardData}
              className={styles.errorButton}
              style={{ marginTop: "1rem", maxWidth: "300px" }}
            >
              Reload
            </button>
          )}
        </div>
      </div>
    );
  }

  const { profile, attractionScore, kpis } = dashboardData;

  return (
    <div className={styles.container}>
      <div className={styles.containerInner}>
        {/* Header with improved layout */}
        <div className={styles.header}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className={styles.headerTitle}>{profile.companyName || "Startup Dashboard"}</h1>
              <p className={styles.headerSubtitle}>
                {profile.oneLinePitch || "Your startup metrics and insights"}
              </p>
            </div>
            {/* Mode Badge */}
            <span
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "600",
                backgroundColor: mode === "investor" ? "#fef3c7" : "#dbeafe",
                color: mode === "investor" ? "#92400e" : "#1e40af",
                whiteSpace: "nowrap",
              }}
            >
              {mode === "investor" ? "👁️ Investor View" : "✏️ Startup Mode"}
            </span>
          </div>
        </div>

        {/* Attraction Score at Top (Most Important) */}
        <div
          className={styles.snapshotCard}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: "0.5rem" }}>
                Attraction Score
              </p>
              <div style={{ fontSize: "3.5rem", fontWeight: "800", lineHeight: "1" }}>
                {attractionScore}
              </div>
              <p style={{ fontSize: "0.875rem", opacity: 0.8, marginTop: "0.5rem" }}>
                out of 100
              </p>
            </div>
            <div style={{ textAlign: "center", fontSize: "3rem" }}>🎯</div>
          </div>
        </div>

        {/* Company Overview Section */}
        <div className={styles.snapshotCard}>
          <h2 className={styles.sectionTitle}>Company Overview</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Stage */}
            <div className={styles.overviewBox}>
              <span className={styles.overviewLabel}>Stage</span>
              <span className={styles.stageTag} style={{ marginTop: "0.5rem" }}>
                {profile.stage || "Not specified"}
              </span>
            </div>

            {/* Funding Ask */}
            <div className={styles.overviewBox}>
              <span className={styles.overviewLabel}>Funding Ask</span>
              <p style={{ fontSize: "1.75rem", fontWeight: "700", color: "#1e40af", marginTop: "0.5rem" }}>
                ₹{(profile.fundingAsk || 0).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Market Size */}
            {profile.totalMarketSize && (
              <div className={styles.overviewBox}>
                <span className={styles.overviewLabel}>Market Size</span>
                <p style={{ fontSize: "1.75rem", fontWeight: "700", color: "#059669", marginTop: "0.5rem" }}>
                  ₹{(profile.totalMarketSize || 0).toLocaleString("en-IN")}
                </p>
              </div>
            )}

            {/* Startup ID */}
            <div className={styles.overviewBox}>
              <span className={styles.overviewLabel}>Startup ID</span>
              <p style={{ fontSize: "1rem", fontWeight: "600", color: "#6b7280", marginTop: "0.5rem" }}>
                {profile.startupId}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics (KPI Cards) - Prominent position */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 className={styles.sectionTitle}>Performance Metrics</h2>
          <KPICards
            currentRevenue={kpis.currentRevenue}
            currentUsers={kpis.currentUsers}
            momGrowthPercent={kpis.momGrowthPercent}
            payingCustomers={kpis.payingCustomers}
          />
        </div>

        {/* Charts Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 className={styles.sectionTitle}>Growth Trends</h2>
          <RevenueUsersChart
            revenueSeries={dashboardData.series.revenueSeries}
            usersSeries={dashboardData.series.usersSeries}
          />
        </div>

        {/* Forms Section - Startup Mode Only */}
        {mode === "startup" && (
          <div style={{ marginBottom: "2rem" }}>
            <h2 className={styles.sectionTitle}>Data Management</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <div>
                <ProfileForm
                  startupId={resolvedStartupId}
                  existingProfile={profile}
                  onSave={handleProfileSave}
                />
              </div>
              <div>
                <MetricsForm
                  startupId={resolvedStartupId}
                  onMetricSaved={fetchDashboardData}
                />
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown - Startup Mode Only */}
        {mode === "startup" && (
          <div style={{ marginBottom: "2rem" }}>
            <StrengthCharts
              attractionScore={attractionScore}
              scoreBreakdown={dashboardData.scoreBreakdown}
            />
          </div>
        )}

        <GrowthInsights insights={dashboardData.insights} />

        <div style={{ marginBottom: "2rem" }}>
          <h2 className={styles.sectionTitle}>Unit Economics</h2>
          <UnitEconomics unitEconomics={dashboardData.unitEconomics} />
        </div>

        {/* Team Section */}
        {profile.team && profile.team.length > 0 && (
          <div className={styles.snapshotCard}>
            <h2 className={styles.sectionTitle}>Team</h2>

            <div className={styles.teamGrid}>
              {profile.team.map((member, index) => (
                <div key={index} className={styles.teamCard}>
                  <h3 className={styles.teamName}>
                    {member.name || "Unknown"}
                  </h3>
                  <p className={styles.teamRole}>
                    {member.role || "Role not specified"}
                  </p>
                  <p className={styles.teamMeta}>
                    <span style={{ fontWeight: "600" }}>Experience:</span>{" "}
                    {member.yearsExperience || 0} years
                  </p>
                  {member.isMedicalExpert && (
                    <p className={styles.expertBadge}>
                      ✓ Medical Expert
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Section */}
        {profile.marketSizeDescription && (
          <div className={styles.snapshotCard}>
            <h2 className={styles.sectionTitle}>Market Opportunity</h2>
            <p className={styles.marketDescription}>
              {profile.marketSizeDescription}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

StartupDashboard.propTypes = {
  startupId: PropTypes.string,
};


export default StartupDashboard;
