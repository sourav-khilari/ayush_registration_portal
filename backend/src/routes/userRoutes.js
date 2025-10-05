// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  uploadVerificationDoc,
  verifyGovOfficial,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const multer = require("multer");
const upload = multer({ dest: "tmp/" });

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected Routes
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/profile/verification-doc", authMiddleware, upload.single("file"), uploadVerificationDoc);
router.post("/:user_id/verify-gov", authMiddleware, requireRole("admin"), verifyGovOfficial);

module.exports = router;
