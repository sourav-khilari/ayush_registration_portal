import express from "express";
import auth from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getMyConversationForStartupHandler,
  listConversationsForStartupHandler,
  getOrCreateOwnerInvestorConversationHandler,
  listMyConversationsHandler,
  getConversationByIdHandler,
  postMessageToConversationHandler,
  markConversationSeenHandler,
  toggleBlockConversationHandler,
  reportConversationHandler,
} from "../controllers/conversationController.js";

const router = express.Router();
const chatUploadDir = path.resolve("public", "chat_uploads");
fs.mkdirSync(chatUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatUploadDir),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "file").replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Investor: get/create their conversation for a startup
router.get("/startup/:startup_id/mine", auth, getMyConversationForStartupHandler);

// Startup owner: list conversations for a startup (pick investor)
router.get("/startup/:startup_id/list", auth, listConversationsForStartupHandler);
router.get(
  "/startup/:startup_id/investor/:investor_id",
  auth,
  getOrCreateOwnerInvestorConversationHandler,
);

// Current user: list all conversations (notifications/inbox)
router.get("/mine", auth, listMyConversationsHandler);

// Get a conversation by id (participants only)
router.get("/:id", auth, getConversationByIdHandler);

// Send message to a conversation by id (participants only)
router.post("/:id/messages", auth, postMessageToConversationHandler);
router.post("/:id/seen", auth, markConversationSeenHandler);
router.post("/:id/block", auth, toggleBlockConversationHandler);
router.post("/:id/report", auth, reportConversationHandler);
router.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  return res.json({
    success: true,
    attachment: {
      url: `/chat_uploads/${req.file.filename}`,
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
});

export default router;

