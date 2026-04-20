// src/controllers/conversationController.js
import Conversation from "../models/Conversation.js";
import Startup from "../models/Startup.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  AppError,
} from "../middleware/errorHandler.js";

async function assertStartupAndAccess(startup_id, user) {
  const startup = await Startup.findById(startup_id).select("user_id name");
  if (!startup) throw new NotFoundError("Startup");
  const ownerId = startup.user_id;
  const isOwner = String(ownerId) === String(user._id);
  const isInvestor = user.role === "investor";
  if (!isOwner && !isInvestor) {
    throw new AppError(
      "Only investors and the startup owner can access this chat",
      403
    );
  }
  return { startup, ownerId, isOwner, isInvestor };
}

// Investor: get/create their conversation for a startup
async function getMyConversationForStartup(req, res) {
  const { startup_id } = req.params;
  const user = req.user;

  const { ownerId, isInvestor, isOwner } = await assertStartupAndAccess(
    startup_id,
    user
  );

  if (isOwner) {
    throw new AppError(
      "Startup owner must select an investor conversation",
      400
    );
  }
  if (!isInvestor) throw new AppError("Forbidden", 403);

  const ids = [String(ownerId), String(user._id)].sort();
  const participants_key = ids.join("_");

  let convo = await Conversation.findOne({ startup_id, participants_key }).lean();
  if (!convo) {
    try {
      const created = await Conversation.create({
        startup_id,
        participants: [ownerId, user._id],
        messages: [],
      });
      convo = created.toObject();
    } catch (e) {
      // In case of race / unique index, fetch again
      convo = await Conversation.findOne({ startup_id, participants_key }).lean();
      if (!convo) throw e;
    }
  }

  return res.json({ success: true, conversation: convo });
}

// Owner: list conversations for a startup (so they can choose investor)
async function listConversationsForStartup(req, res) {
  const { startup_id } = req.params;
  const user = req.user;

  const { ownerId, isOwner } = await assertStartupAndAccess(startup_id, user);
  if (!isOwner) throw new AppError("Only startup owner can list chats", 403);

  const convos = await Conversation.find({ startup_id })
    .sort({ updatedAt: -1 })
    .populate({ path: "participants", select: "_id name email role" })
    .lean();

  // Attach investor info for convenience (participant that isn't owner)
  const items = convos.map((c) => {
    const investor =
      (c.participants || []).find((p) => String(p._id) !== String(ownerId)) ||
      null;
    return {
      _id: c._id,
      startup_id: c.startup_id,
      investor,
      updatedAt: c.updatedAt,
      lastMessage: c.messages?.length
        ? c.messages[c.messages.length - 1]
        : null,
    };
  });

  return res.json({ success: true, items });
}

// Get a conversation by ID (only participants)
async function getConversationById(req, res) {
  const { id } = req.params;
  const user = req.user;
  const convo = await Conversation.findById(id).lean();
  if (!convo) throw new NotFoundError("Conversation");
  const isParticipant = (convo.participants || []).some(
    (p) => String(p) === String(user._id)
  );
  if (!isParticipant) throw new AppError("Forbidden", 403);
  return res.json({ success: true, conversation: convo });
}

// Send message to a specific conversation (only participants)
async function postMessageToConversation(req, res) {
  const { id } = req.params;
  const { text } = req.body || {};
  const user = req.user;

  if (!text || !text.trim()) throw new ValidationError("Message text is required");

  const convo = await Conversation.findById(id);
  if (!convo) throw new NotFoundError("Conversation");

  const isParticipant = (convo.participants || []).some(
    (p) => String(p) === String(user._id)
  );
  if (!isParticipant) throw new AppError("Forbidden", 403);

  convo.messages.push({
    sender: user._id,
    sender_role: user.role,
    text: text.trim(),
  });
  await convo.save();

  // Email notify the other participant (best-effort)
  try {
    const otherId = (convo.participants || []).find(
      (p) => String(p) !== String(user._id),
    );
    if (otherId) {
      const other = await User.findById(otherId).select("email name").lean();
      const senderName = user?.name || user?.email || "User";
      const startup = await Startup.findById(convo.startup_id).select("name").lean();
      if (other?.email) {
        await sendEmail({
          email: other.email,
          subject: `New message on AYUSH${startup?.name ? `: ${startup.name}` : ""}`,
          message: `${senderName}: ${text.trim()}`,
          html: `<p>Hello ${other.name || "User"},</p>
                <p>You have a new message from <strong>${senderName}</strong>${startup?.name ? ` regarding <strong>${startup.name}</strong>` : ""}.</p>
                <blockquote style="margin:12px 0;padding:10px;border-left:3px solid #e2e8f0;background:#f8fafc;">
                  ${String(text.trim()).replace(/</g, "&lt;").replace(/>/g, "&gt;")}
                </blockquote>
                <p>Please login to the portal to reply.</p>`,
        });
      }
    }
  } catch (_) {}

  return res.status(201).json({ success: true, conversation: convo });
}

export const getMyConversationForStartupHandler = asyncHandler(
  getMyConversationForStartup
);
export const listConversationsForStartupHandler = asyncHandler(
  listConversationsForStartup
);
export const getConversationByIdHandler = asyncHandler(getConversationById);
export const postMessageToConversationHandler = asyncHandler(
  postMessageToConversation
);

