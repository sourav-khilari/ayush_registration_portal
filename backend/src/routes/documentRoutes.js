// src/routes/documentRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer({ dest: "tmp/" });
const {
  uploadDocumentHandler,
  getDocument,
  reassignDocument,
  getRequirements,
  setDocumentVerification,
} = require("../controllers/documentController");

router.get("/requirements/list", auth, getRequirements);
router.post("/upload", auth, upload.single("file"), uploadDocumentHandler);
router.get("/:id", auth, getDocument);
router.post("/:id/reassign", auth, reassignDocument);
// Only verified gov_officials or admins can verify
const requireRole = require("../middleware/requireRole");
router.post("/:id/verify", auth, (req, res, next) => {
  const isAdmin = req.user.role === "admin";
  const isGov = req.user.role === "gov_official" && req.user.role_verified === true;
  if (!isAdmin && !isGov) {
    return res.status(403).json({ message: "Forbidden: only verified officials/admin" });
  }
  next();
}, setDocumentVerification);

module.exports = router;
