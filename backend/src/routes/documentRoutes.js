// src/routes/documentRoutes.js
import express from "express";
import auth from "../middleware/authMiddleware.js";
import multer from "multer";
import {
  uploadDocumentHandler,
  getDocument,
  listDocuments,
  reassignDocument,
  getRequirements,
  setDocumentVerification,
} from "../controllers/documentController.js";

const router = express.Router();
const upload = multer({ dest: "tmp/" });

router.get("/requirements/list", auth, getRequirements);
router.get("/list", auth, listDocuments);
router.post("/upload", auth, upload.single("file"), uploadDocumentHandler);
router.get("/:id", auth, getDocument);
router.post("/:id/reassign", auth, reassignDocument);
// Only verified gov_officials or admins can verify
import requireRole from "../middleware/requireRole.js";
router.post(
  "/:id/verify",
  auth,
  (req, res, next) => {
    const isAdmin = req.user.role === "admin";
    const isGov =
      req.user.role === "gov_official" && req.user.role_verified === true;
    if (!isAdmin && !isGov) {
      return res
        .status(403)
        .json({ message: "Forbidden: only verified officials/admin" });
    }
    next();
  },
  setDocumentVerification
);

export default router;
