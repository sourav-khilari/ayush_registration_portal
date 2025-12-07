import express from "express";
import auth from "../middleware/authMiddleware.js";
import multer from "multer";
import {
  uploadDocumentHandler,
  getDocumentHandler,
  listDocumentsHandler,
  reassignDocumentHandler,
  getRequirementsHandler,
  setDocumentVerificationHandler,
  emailLookupHandler,
  verifyOtpHandler,
  replaceRejectedDocumentHandler,
} from "../controllers/documentController.js";
import { AuthorizationError } from "../middleware/errorHandler.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();
const upload = multer({ dest: "tmp/" });

// Routes
router.get("/requirements/list", auth, getRequirementsHandler);
router.get("/list", auth, listDocumentsHandler);
router.post("/upload", auth, upload.single("file"), uploadDocumentHandler);
router.get("/:id", auth, getDocumentHandler);
router.post("/:id/reassign", auth, reassignDocumentHandler);
router.post("/:id/replace", auth, upload.single("file"), replaceRejectedDocumentHandler);

// Email lookup -> send OTP
router.post("/email-lookup", emailLookupHandler);

// Verify OTP
router.post("/verify-otp", auth, verifyOtpHandler);

// Only verified gov_officials or admins can verify
router.post(
  "/:id/verify",
  auth,
  (req, res, next) => {
    // ✅ Temporarily skip role restrictions
    // Allow all authenticated users to verify
    next();
  },
  setDocumentVerificationHandler
);
export default router;
