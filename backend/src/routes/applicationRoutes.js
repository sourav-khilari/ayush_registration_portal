// src/routes/applicationRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  createApplication,
  submitApplication,
  getApplication,
  listApplicationsForOfficials,
} = require("../controllers/applicationController");

router.post("/", auth, createApplication);
router.post("/:id/submit", auth, submitApplication);
router.get("/:id", auth, getApplication);

// Only verified govt officials or admins can list all applications
router.get("/", auth, (req, res, next) => {
  const isAdmin = req.user.role === "admin";
  const isGov = req.user.role === "gov_official" && req.user.role_verified === true;
  if (!isAdmin && !isGov) {
    return res.status(403).json({ message: "Forbidden: only verified officials/admin" });
  }
  next();
}, listApplicationsForOfficials);

module.exports = router;
