// src/routes/startupRoutes.js
import express from "express";
import auth from "../middleware/authMiddleware.js";
import * as ctr from "../controllers/startupController.js";

const router = express.Router();

router.post("/", auth, ctr.createStartup);
router.get("/mine", auth, ctr.getMyStartups);

// Investor-friendly listing with rich filters
router.get("/investor", auth, ctr.listStartupsForInvestors);
router.get("/startup-owner/verified-investors", auth, ctr.listVerifiedInvestorsForStartupOwner);

// Separate API for bar graph (profit vs expense)
router.get("/:id/charts/profit-expense", auth, ctr.getProfitExpenseChart);
router.get("/:id/analytics/forecast", auth, ctr.getFinancialForecast);
router.get("/:id/analytics/alerts", auth, ctr.getFinancialAlerts);
router.get("/:id/analytics/export", auth, ctr.exportFinancialAnalytics);

// Government officials/admins can update startup status (approve/reject/etc.)
router.patch("/:id/status", auth, ctr.updateStartupStatusByOfficial);

// Only verified govt officials or admins can list all startups
router.get("/", auth, (req, res, next) => {
  const isAdmin = req.user.role === "admin";
  const isGov = req.user.role === "gov_official" && req.user.role_verified === true;
  if (!isAdmin && !isGov) {
    return res.status(403).json({ message: "Forbidden: only verified officials/admin" });
  }
  next();
}, ctr.listStartupsForOfficials);
router.get("/:id", auth, ctr.getStartupById);
router.put("/:id", auth, ctr.updateStartup);
router.delete("/:id", auth, ctr.deleteStartup);

export default router;
