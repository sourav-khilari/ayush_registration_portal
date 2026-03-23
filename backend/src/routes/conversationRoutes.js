import express from "express";
import auth from "../middleware/authMiddleware.js";
import {
  getMyConversationForStartupHandler,
  listConversationsForStartupHandler,
  getConversationByIdHandler,
  postMessageToConversationHandler,
} from "../controllers/conversationController.js";

const router = express.Router();

// Investor: get/create their conversation for a startup
router.get("/startup/:startup_id/mine", auth, getMyConversationForStartupHandler);

// Startup owner: list conversations for a startup (pick investor)
router.get("/startup/:startup_id/list", auth, listConversationsForStartupHandler);

// Get a conversation by id (participants only)
router.get("/:id", auth, getConversationByIdHandler);

// Send message to a conversation by id (participants only)
router.post("/:id/messages", auth, postMessageToConversationHandler);

export default router;

