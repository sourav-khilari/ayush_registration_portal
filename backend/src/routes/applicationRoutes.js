// src/routes/applicationRoutes.js
import express from "express";
import auth from "../middleware/authMiddleware.js";
import {
  createApplication,
  submitApplication,
  getApplication,
  listApplicationsForOfficials,
} from "../controllers/applicationController.js";

const router = express.Router();

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

export default router;
