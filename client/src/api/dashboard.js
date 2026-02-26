// src/api/dashboard.js
/**
 * Dashboard API Service
 * Handles all API calls related to startup dashboard operations.
 * Manages profile data, metrics, and dashboard data fetching.
 * 
 * API Endpoints:
 * - GET  /api/dashboard/:startupId  - Fetch complete dashboard
 * - POST /api/startup/:startupId/profile - Save profile
 * - POST /api/startup/:startupId/metrics - Save metrics
 */

import axios from "axios";

const API_BASE_URL = "/api";

/**
 * Fetch startup dashboard data
 * @param {String} startupId - The startup identifier
 * @param {String} role - User role ("startup_owner" | "investor")
 * @returns {Promise<Object>} Dashboard data
 */
export const getDashboard = async (startupId, role = "investor") => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/dashboard/${startupId}?role=${role}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    throw error;
  }
};

/**
 * Save or update startup profile
 * @param {String} startupId - The startup identifier
 * @param {Object} profileData - Profile data to save
 * @returns {Promise<Object>} Updated profile
 */
export const saveProfile = async (startupId, profileData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/startup/${startupId}/profile`,
      profileData
    );
    return response.data;
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
};

/**
 * Save metric entry for a startup
 * @param {String} startupId - The startup identifier
 * @param {Object} metricData - Metric data (month, revenue, users, paying_customers)
 * @returns {Promise<Object>} Saved metric
 */
export const saveMetrics = async (startupId, metricData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/startup/${startupId}/metrics`,
      metricData
    );
    return response.data;
  } catch (error) {
    console.error("Error saving metrics:", error);
    throw error;
  }
};
