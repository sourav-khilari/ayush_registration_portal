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
  rejectGovOfficial,
  listAllUsers,
  deleteUserByAdmin,
  getSystemActivity,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/requireRole.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "tmp/" });

// Public Routes
router.post("/register/send-otp", sendSignupOtp);
router.post(
  "/register",
  upload.fields([
    { name: "pan_card_file", maxCount: 1 },
    { name: "gov_aadhaar_file", maxCount: 1 },
  ]),
  registerUser
);
router.post("/login", loginUser);

// Protected Routes
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/profile/verification-doc", authMiddleware, upload.single("file"), uploadVerificationDoc);
// Admin routes
router.get("/gov-officials", authMiddleware, requireRole("admin"), listGovOfficials);
router.post("/:user_id/verify-gov", authMiddleware, requireRole("admin"), verifyGovOfficial);
router.post("/:user_id/reject-gov", authMiddleware, requireRole("admin"), rejectGovOfficial);
router.get("/admin/all-users", authMiddleware, requireRole("admin"), listAllUsers);
router.delete("/admin/users/:user_id", authMiddleware, requireRole("admin"), deleteUserByAdmin);
router.get("/admin/system-activity", authMiddleware, requireRole("admin"), getSystemActivity);

export default router;
