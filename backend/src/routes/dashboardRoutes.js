// src/routes/dashboardRoutes.js
/**
 * Dashboard Routes
 * API endpoints for startup dashboard operations.
 * 
 * Endpoints:
 * POST   /startup/:startupId/profile    - Create/update startup profile
 * POST   /startup/:startupId/metrics    - Save monthly metrics
 * GET    /dashboard/:startupId          - Fetch complete dashboard data (includes insights, unitEconomics)
 */

import express from "express";
import {
  saveStartupProfile,
  saveMetricEntry,
  getDashboard,
} from "../controllers/dashboardController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = express.Router();

/**
 * POST /startup/:startupId/profile
 * Create or update StartupProfile
 */
router.post("/startup/:startupId/profile", asyncHandler(saveStartupProfile));

/**
 * POST /startup/:startupId/metrics
 * Create or update MetricEntry for given month
 */
router.post("/startup/:startupId/metrics", asyncHandler(saveMetricEntry));

/**
 * GET /dashboard/:startupId
 * Fetch complete dashboard data
 * Query params:
 *   - role: "startup_owner" | "investor" (default: investor)
 */
router.get("/dashboard/:startupId", asyncHandler(getDashboard));

export default router;
