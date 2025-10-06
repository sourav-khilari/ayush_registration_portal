// src/routes/startupRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctr = require("../controllers/startupController");

router.post("/", auth, ctr.createStartup);
router.get("/mine", auth, ctr.getMyStartups);
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

module.exports = router;
