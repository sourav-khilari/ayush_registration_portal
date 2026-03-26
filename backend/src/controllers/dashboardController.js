// src/controllers/dashboardController.js
/**
 * Dashboard Controller
 * Handles startup dashboard metrics, scoring, and data assembly.
 * 
 * Features:
 * - Compute attraction scores based on startup profile and metrics
 * - Assemble complete dashboard data with KPIs and charts
 * - Role-based data filtering (investor vs startup owner)
 */

import StartupProfile from "../models/StartupProfile.js";
import MetricEntry from "../models/MetricEntry.js";
import { getAIInsight } from "../utils/aiInsightService.js";

/**
 * Compute attraction score based on profile and metrics.
 * Scoring breakdown:
 * - Traction (40%): Latest revenue + users
 * - Team (30%): Years of experience + medical expert bonus
 * - Growth (20%): Month-over-month user growth
 * - Completeness (10%): Profile field completeness
 *
 * @param {Object} profile - StartupProfile document
 * @param {Array} metrics - Array of MetricEntry documents (sorted by month)
 * @returns {Object} { totalScore, breakdown }
 */
function computeAttractionScore(profile, metrics) {
  let scores = {
    traction: 0,
    team: 0,
    growth: 0,
    completeness: 0,
  };

  // ===== TRACTION SCORE (40%) =====
  if (metrics && metrics.length > 0) {
    const latestMetric = metrics[metrics.length - 1];
    const revenue = latestMetric.revenue || 0;
    const users = latestMetric.users || 0;

    // Normalize: Cap at high values to prevent skewing
    // Assume 100k INR revenue is good, 10k+ users is good
    const revenueScore = Math.min((revenue / 100000) * 50, 50);
    const usersScore = Math.min((users / 10000) * 50, 50);
    scores.traction = Math.round((revenueScore + usersScore) / 2);
  }

  // ===== TEAM SCORE (30%) =====
  if (profile.team && profile.team.length > 0) {
    let totalExperience = 0;
    let medicalExpertCount = 0;

    profile.team.forEach((member) => {
      totalExperience += member.yearsExperience || 0;
      if (member.isMedicalExpert) medicalExpertCount += 1;
    });

    // Base score: 5 points per year of experience (capped at 25)
    let teamScore = Math.min(totalExperience * 5, 25);

    // Bonus for medical experts: 5 points per expert (capped at additional 5)
    const medicalBonus = Math.min(medicalExpertCount * 5, 5);
    teamScore = Math.min(teamScore + medicalBonus, 30);

    scores.team = Math.round(teamScore);
  }

  // ===== GROWTH SCORE (20%) =====
  if (metrics && metrics.length >= 2) {
    const latestMetric = metrics[metrics.length - 1];
    const previousMetric = metrics[metrics.length - 2];

    const latestUsers = latestMetric.users || 0;
    const previousUsers = previousMetric.users || 0;

    let growthPercent = 0;
    if (previousUsers > 0) {
      growthPercent = ((latestUsers - previousUsers) / previousUsers) * 100;
    }

    // Positive growth: 1 point per 5% growth (capped at 20)
    // Negative growth: 0
    if (growthPercent > 0) {
      scores.growth = Math.min((growthPercent / 5) * 1, 20);
    } else {
      scores.growth = 0;
    }
    scores.growth = Math.round(scores.growth);
  }

  // ===== COMPLETENESS SCORE (10%) =====
  // Check which key fields are filled
  const profileFields = [
    "oneLinePitch",
    "stage",
    "fundingAsk",
    "equityOfferedPercent",
    "team",
    "marketSizeDescription",
  ];

  let filledFields = 0;
  profileFields.forEach((field) => {
    const value = profile[field];
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        if (value.length > 0) filledFields += 1;
      } else {
        filledFields += 1;
      }
    }
  });

  scores.completeness = Math.round((filledFields / profileFields.length) * 10);

  // ===== CALCULATE TOTAL SCORE =====
  // Traction: 40%, Team: 30%, Growth: 20%, Completeness: 10%
  const totalScore = Math.round(
    (scores.traction * 0.4 +
      scores.team * 0.3 +
      scores.growth * 0.2 +
      scores.completeness * 0.1) *
      1
  );

  return {
    totalScore: Math.min(Math.max(totalScore, 0), 100),
    breakdown: {
      traction: scores.traction,
      team: scores.team,
      growth: scores.growth,
      completeness: scores.completeness,
    },
  };
}

/**
 * Generate short growth insights from metrics and KPIs.
 * Simple rule-based analysis (max 3 insights).
 *
 * @param {Array} metrics - Array of MetricEntry documents (sorted by month)
 * @param {Object} kpis - KPI object with currentRevenue, currentUsers, momGrowthPercent, payingCustomers
 * @returns {Array} Array of insight strings
 */
export function generateGrowthInsight(metrics, kpis) {
  const insights = [];

  // ----- Revenue trend over last 3 months -----
  const lastThree = (metrics || []).slice(-3);
  if (lastThree.length >= 3) {
    const r1 = lastThree[0].revenue || 0;
    const r2 = lastThree[1].revenue || 0;
    const r3 = lastThree[2].revenue || 0;

    if (r1 < r2 && r2 < r3) {
      insights.push("Revenue growing consistently over the last quarter.");
    } else if (r1 > r2 && r2 > r3) {
      insights.push("Revenue decline detected — investigate retention.");
    } else {
      insights.push("Revenue trend is mixed over the last quarter.");
    }
  }

  // ----- MoM growth percent -----
  const momGrowthPercent = Number(kpis?.momGrowthPercent || 0);
  if (momGrowthPercent > 10) {
    insights.push("Strong MoM user growth momentum.");
  } else if (momGrowthPercent > 0) {
    insights.push("User growth positive but modest.");
  } else {
    insights.push("User growth is flat or negative.");
  }

  // ----- Conversion rate (payingCustomers / users) -----
  const users = Number(kpis?.currentUsers || 0);
  const payingCustomers = Number(kpis?.payingCustomers || 0);

  if (users > 0) {
    const conversionRate = payingCustomers / users;
    if (conversionRate < 0.02) {
      insights.push("User growth positive but conversion rate is below optimal.");
    } else if (conversionRate > 0.1) {
      insights.push("Conversion rate is strong compared to typical benchmarks.");
    } else {
      insights.push("Conversion rate is healthy but can improve.");
    }
  }

  return insights.slice(0, 3);
}

/**
 * Compute unit economics from latest metrics entry.
 *
 * @param {Array} metrics - Array of MetricEntry documents (sorted by month)
 * @returns {Object} { arpu, revenuePerPayingCustomer, conversionRate }
 */
export function computeUnitEconomics(metrics) {
  const latest = (metrics || []).slice(-1)[0] || {};

  const revenue = Number(latest.revenue || 0);
  const users = Number(latest.users || 0);
  const payingCustomers = Number(latest.paying_customers || 0);

  const arpu = users > 0 ? revenue / users : 0;
  const revenuePerPayingCustomer = payingCustomers > 0 ? revenue / payingCustomers : 0;
  const conversionRate = users > 0 ? (payingCustomers / users) * 100 : 0;

  return {
    arpu: Number(arpu.toFixed(2)),
    revenuePerPayingCustomer: Number(revenuePerPayingCustomer.toFixed(2)),
    conversionRate: Number(conversionRate.toFixed(2)),
  };
}

/**
 * Assemble complete dashboard data for a startup.
 * Fetches profile, metrics, and computes scores.
 * Hides sensitive data for investors.
 *
 * @param {String} startupId - The startup identifier
 * @param {String} role - User role ("investor", "startup_owner", etc.)
 * @returns {Promise<Object>} Structured dashboard data
 */
async function assembleDashboardData(startupId, role) {
  try {
    // Fetch startup profile (fallback to empty profile if not found)
    let profile = await StartupProfile.findOne({ startupId });
    if (!profile) {
      profile = {
        startupId,
        oneLinePitch: "",
        stage: "",
        fundingAsk: 0,
        equityOfferedPercent: 0,
        team: [],
        marketSizeDescription: "",
        visibility: { investors: true, public: false },
        createdAt: null,
        updatedAt: null,
      };
    }

    // Fetch last 12 metrics sorted by month ascending
    const metrics = await MetricEntry.find({ startupId })
      .sort({ month: 1 })
      .limit(12);

    // Compute attraction score
    const { totalScore, breakdown } = computeAttractionScore(profile, metrics);

    // Prepare KPIs from latest metric
    let kpis = {
      currentRevenue: 0,
      currentUsers: 0,
      momGrowthPercent: 0,
      payingCustomers: 0,
    };

    if (metrics.length > 0) {
      const latestMetric = metrics[metrics.length - 1];
      kpis.currentRevenue = latestMetric.revenue || 0;
      kpis.currentUsers = latestMetric.users || 0;
      kpis.payingCustomers = latestMetric.paying_customers || 0;

      // Calculate MoM growth
      if (metrics.length >= 2) {
        const previousMetric = metrics[metrics.length - 2];
        const previousUsers = previousMetric.users || 0;
        if (previousUsers > 0) {
          kpis.momGrowthPercent = Number(
            (
              ((latestMetric.users - previousUsers) / previousUsers) *
              100
            ).toFixed(2)
          );
        }
      }
    }

    // Prepare series data for charts
    const series = {
      revenueSeries: metrics.map((m) => ({
        x: m.month,
        y: m.revenue || 0,
      })),
      usersSeries: metrics.map((m) => ({
        x: m.month,
        y: m.users || 0,
      })),
    };

    // Prepare profile data (clean sensitive fields if investor role)
    let profileData = {
      startupId: profile.startupId,
      oneLinePitch: profile.oneLinePitch,
      stage: profile.stage,
      fundingAsk: profile.fundingAsk,
      equityOfferedPercent: profile.equityOfferedPercent,
      team: profile.team || [],
      marketSizeDescription: profile.marketSizeDescription,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    // Hide visibility settings if investor role
    if (role !== "investor") {
      profileData.visibility = profile.visibility;
    }

    let insights = generateGrowthInsight(metrics, kpis);
    let insightsSource = "fallback";

    if (process.env.OPENAI_API_KEY) {
      try {
        const aiPrompt =
          "Generate maximum 3 concise startup growth insights as bullet points based on the provided KPI and monthly trend data. Focus on revenue trend, user growth momentum, and conversion quality.";

        const aiData = JSON.stringify(
          {
            startupId,
            role,
            kpis,
            unitEconomics: computeUnitEconomics(metrics),
            series,
          },
          null,
          2
        );

        const aiResult = await getAIInsight({
          prompt: aiPrompt,
          data: aiData,
        });

        const parsedInsights = String(aiResult?.insight || "")
          .split("\n")
          .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 3);

        if (parsedInsights.length > 0) {
          insights = parsedInsights;
          insightsSource = "ai";
        }
      } catch (aiError) {
        console.error("[AI_INSIGHTS_ERROR] Failed to generate AI insights.");
        console.error("[AI_INSIGHTS_ERROR] Context:", {
          startupId,
          role,
          hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        });
        console.error("[AI_INSIGHTS_ERROR] Message:", aiError?.message || aiError);
        if (aiError?.stack) {
          console.error("[AI_INSIGHTS_ERROR] Stack:", aiError.stack);
        }
        if (aiError?.response) {
          console.error("[AI_INSIGHTS_ERROR] Response:", aiError.response);
        }
        console.warn("[AI_INSIGHTS_ERROR] Using fallback insights.");
      }
    }

    // Assemble final response
    const dashboardData = {
      profile: profileData,
      kpis,
      series,
      attractionScore: totalScore,
      scoreBreakdown: breakdown,
      insights,
      insightsSource,
      unitEconomics: computeUnitEconomics(metrics),
    };

    return dashboardData;
  } catch (error) {
    console.error("Error assembling dashboard data:", error);
    return {
      error: "Failed to assemble dashboard data",
      details: error.message,
    };
  }
}

/**
 * Controller: Save or update startup profile
 */
export async function saveStartupProfile(req, res) {
  const { startupId } = req.params;
  const profileData = req.body;

  if (!startupId) {
    return res.status(400).json({
      success: false,
      error: "Startup ID is required",
    });
  }

  const updatedProfile = await StartupProfile.findOneAndUpdate(
    { startupId },
    { ...profileData, startupId },
    { upsert: true, new: true }
  );

  res.status(200).json({
    success: true,
    message: "Profile saved successfully",
    profile: updatedProfile,
  });
}

/**
 * Controller: Save or update metric entry for a startup
 */
export async function saveMetricEntry(req, res) {
  const { startupId } = req.params;
  const { month, revenue, users, paying_customers } = req.body;

  if (!startupId) {
    return res.status(400).json({
      success: false,
      error: "Startup ID is required",
    });
  }

  if (!month) {
    return res.status(400).json({
      success: false,
      error: "Month field is required",
    });
  }

  const savedMetric = await MetricEntry.findOneAndUpdate(
    { startupId, month },
    {
      startupId,
      month,
      revenue: revenue || 0,
      users: users || 0,
      paying_customers: paying_customers || 0,
    },
    { upsert: true, new: true }
  );

  res.status(200).json({
    success: true,
    message: "Metric saved successfully",
    metric: savedMetric,
  });
}

/**
 * Controller: Fetch complete dashboard data for a startup
 */
export async function getDashboard(req, res) {
  const { startupId } = req.params;
  const { role = "investor" } = req.query;

  if (!startupId) {
    return res.status(400).json({
      success: false,
      error: "Startup ID is required",
    });
  }

  const dashboardData = await assembleDashboardData(startupId, role);

  // Check if error occurred
  if (dashboardData.error) {
    return res.status(404).json({
      success: false,
      error: dashboardData.error,
    });
  }

  res.status(200).json({
    success: true,
    data: dashboardData,
  });
}
