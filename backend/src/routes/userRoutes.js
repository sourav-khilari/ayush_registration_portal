// src/routes/userRoutes.js
import express from "express";
import {
  sendSignupOtp,
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  uploadVerificationDoc,
  listGovOfficials,
  verifyGovOfficial,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/requireRole.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "tmp/" });

// Public Routes
router.post("/register/send-otp", sendSignupOtp);
router.post("/register", upload.single("pan_card_file"), registerUser);
router.post("/login", loginUser);

// Protected Routes
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/profile/verification-doc", authMiddleware, upload.single("file"), uploadVerificationDoc);
// Admin routes
router.get("/gov-officials", authMiddleware, requireRole("admin"), listGovOfficials);
router.post("/:user_id/verify-gov", authMiddleware, requireRole("admin"), verifyGovOfficial);

export default router;
