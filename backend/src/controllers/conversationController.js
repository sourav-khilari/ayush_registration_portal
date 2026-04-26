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

function countUnread(messages = [], userId) {
  const me = String(userId);
  return messages.filter((m) => {
    const isMine = String(m.sender) === me;
    const seen = (m.seenBy || []).some((id) => String(id) === me);
    return !isMine && !seen;
  }).length;
}

function mapListItem(c, userId) {
  const otherParticipant =
    (c.participants || []).find((p) => String(p._id) !== String(userId)) ||
    null;
  const lastMessage = c.messages?.length
    ? c.messages[c.messages.length - 1]
    : null;
  return {
    _id: c._id,
    startup: c.startup_id || null,
    otherParticipant,
    updatedAt: c.updatedAt,
    lastMessage,
    unreadCount: countUnread(c.messages || [], userId),
    blockedByMe: (c.blocked_by || []).some(
      (id) => String(id) === String(userId),
    ),
  };
}

async function assertStartupAndAccess(startup_id, user) {
  const startup = await Startup.findById(startup_id).select("user_id name");
  if (!startup) throw new NotFoundError("Startup");
  const ownerId = startup.user_id;
  const isOwner = String(ownerId) === String(user._id);
  const isInvestor = user.role === "investor";
  if (!isOwner && !isInvestor) {
    throw new AppError(
      "Only investors and the startup owner can access this chat",
      403,
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
    user,
  );

  if (isOwner) {
    throw new AppError(
      "Startup owner must select an investor conversation",
      400,
    );
  }
  if (!isInvestor) throw new AppError("Forbidden", 403);

  const ids = [String(ownerId), String(user._id)].sort();
  const participants_key = ids.join("_");

  let convo = await Conversation.findOne({
    startup_id,
    participants_key,
  }).lean();
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
      convo = await Conversation.findOne({
        startup_id,
        participants_key,
      }).lean();
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

// Owner: get/create conversation with a verified investor for a startup
async function getOrCreateOwnerInvestorConversation(req, res) {
  const { startup_id, investor_id } = req.params;
  const user = req.user;

  const { ownerId, isOwner } = await assertStartupAndAccess(startup_id, user);
  if (!isOwner) throw new AppError("Only startup owner can initiate investor chat", 403);

  const investor = await User.findById(investor_id)
    .select("_id role role_verified is_active")
    .lean();
  if (!investor || investor.role !== "investor" || investor.role_verified !== true) {
    throw new AppError("Investor is not verified for chat", 400);
  }
  if (investor.is_active === false) {
    throw new AppError("Investor account is inactive", 400);
  }

  const ids = [String(ownerId), String(investor._id)].sort();
  const participants_key = ids.join("_");

  let convo = await Conversation.findOne({ startup_id, participants_key }).lean();
  if (!convo) {
    try {
      const created = await Conversation.create({
        startup_id,
        participants: [ownerId, investor._id],
        messages: [],
      });
      convo = created.toObject();
    } catch (e) {
      convo = await Conversation.findOne({ startup_id, participants_key }).lean();
      if (!convo) throw e;
    }
  }

  return res.json({ success: true, conversation: convo });
}

// Current user: list all conversations (for notifications)
async function listMyConversations(req, res) {
  const user = req.user;

  const convos = await Conversation.find({ participants: user._id })
    .sort({ updatedAt: -1 })
    .populate({ path: "participants", select: "_id name email role" })
    .populate({
      path: "startup_id",
      select: "_id name status certificate_url certificate_id user_id",
    })
    .lean();

  const q = String(req.query.q || "")
    .trim()
    .toLowerCase();
  let items = convos.map((c) => mapListItem(c, user._id));
  if (q) {
    items = items.filter((i) => {
      const startupName = String(i.startup?.name || "").toLowerCase();
      const otherName = String(i.otherParticipant?.name || "").toLowerCase();
      const otherEmail = String(i.otherParticipant?.email || "").toLowerCase();
      const preview = String(i.lastMessage?.text || "").toLowerCase();
      return (
        startupName.includes(q) ||
        otherName.includes(q) ||
        otherEmail.includes(q) ||
        preview.includes(q)
      );
    });
  }

  return res.json({ success: true, items });
}

// Get a conversation by ID (only participants)
async function getConversationById(req, res) {
  const { id } = req.params;
  const user = req.user;
  const convo = await Conversation.findById(id).lean();
  if (!convo) throw new NotFoundError("Conversation");
  const isParticipant = (convo.participants || []).some(
    (p) => String(p) === String(user._id),
  );
  if (!isParticipant) throw new AppError("Forbidden", 403);
  const unreadCount = countUnread(convo.messages || [], user._id);
  return res.json({ success: true, conversation: convo, unreadCount });
}

// Send message to a specific conversation (only participants)
async function postMessageToConversation(req, res) {
  const { id } = req.params;
  const { text, attachment } = req.body || {};
  const user = req.user;

  if ((!text || !String(text).trim()) && !attachment?.url) {
    throw new ValidationError("Message text or attachment is required");
  }

  const convo = await Conversation.findById(id);
  if (!convo) throw new NotFoundError("Conversation");

  const isParticipant = (convo.participants || []).some(
    (p) => String(p) === String(user._id),
  );
  if (!isParticipant) throw new AppError("Forbidden", 403);
  if ((convo.blocked_by || []).some((u) => String(u) !== String(user._id))) {
    throw new AppError("You cannot send messages in this conversation", 403);
  }

  convo.messages.push({
    sender: user._id,
    sender_role: user.role,
    text: String(text || "").trim(),
    attachment: attachment?.url
      ? {
          url: attachment.url,
          name: attachment.name || "attachment",
          mimeType: attachment.mimeType || "application/octet-stream",
          size: Number(attachment.size || 0),
        }
      : undefined,
    seenBy: [user._id],
  });
  await convo.save();
  const latest = convo.messages[convo.messages.length - 1];

  // Realtime fanout for message + sidebar updates
  const io = req.app?.get("io");
  if (io) {
    io.to(`conversation:${String(convo._id)}`).emit("chat:new_message", {
      conversationId: String(convo._id),
      message: latest,
    });
    for (const participantId of convo.participants || []) {
      io.to(`user:${String(participantId)}`).emit("chat:sidebar_refresh", {
        conversationId: String(convo._id),
      });
    }
  }

  return res.status(201).json({ success: true, conversation: convo });
}

async function markConversationSeen(req, res) {
  const { id } = req.params;
  const user = req.user;
  const convo = await Conversation.findById(id);
  if (!convo) throw new NotFoundError("Conversation");
  const isParticipant = (convo.participants || []).some(
    (p) => String(p) === String(user._id),
  );
  if (!isParticipant) throw new AppError("Forbidden", 403);

  convo.messages.forEach((m) => {
    if (String(m.sender) !== String(user._id)) {
      const alreadySeen = (m.seenBy || []).some(
        (s) => String(s) === String(user._id),
      );
      if (!alreadySeen) m.seenBy = [...(m.seenBy || []), user._id];
    }
  });
  await convo.save();

  const io = req.app?.get("io");
  if (io) {
    io.to(`conversation:${String(convo._id)}`).emit("chat:seen", {
      conversationId: String(convo._id),
      seenBy: String(user._id),
      at: new Date().toISOString(),
    });
  }

  return res.json({ success: true });
}

async function toggleBlockConversation(req, res) {
  const { id } = req.params;
  const user = req.user;
  const { blocked } = req.body || {};
  const convo = await Conversation.findById(id);
  if (!convo) throw new NotFoundError("Conversation");
  const isParticipant = (convo.participants || []).some(
    (p) => String(p) === String(user._id),
  );
  if (!isParticipant) throw new AppError("Forbidden", 403);

  const myId = String(user._id);
  const existing = (convo.blocked_by || []).map((u) => String(u));
  const next = Boolean(blocked)
    ? Array.from(new Set([...existing, myId]))
    : existing.filter((u) => u !== myId);
  convo.blocked_by = next;
  await convo.save();
  return res.json({ success: true, blockedBy: convo.blocked_by });
}

async function reportConversation(req, res) {
  const { id } = req.params;
  const user = req.user;
  const { reason } = req.body || {};
  if (!reason || !String(reason).trim()) {
    throw new ValidationError("Report reason is required");
  }
  const convo = await Conversation.findById(id);
  if (!convo) throw new NotFoundError("Conversation");
  const isParticipant = (convo.participants || []).some(
    (p) => String(p) === String(user._id),
  );
  if (!isParticipant) throw new AppError("Forbidden", 403);
  convo.reports = [
    ...(convo.reports || []),
    { by: user._id, reason: String(reason).trim() },
  ];
  await convo.save();
  return res.json({ success: true });
}

export const getMyConversationForStartupHandler = asyncHandler(
  getMyConversationForStartup,
);
export const listConversationsForStartupHandler = asyncHandler(
  listConversationsForStartup,
);
export const getOrCreateOwnerInvestorConversationHandler = asyncHandler(
  getOrCreateOwnerInvestorConversation,
);
export const listMyConversationsHandler = asyncHandler(listMyConversations);
export const getConversationByIdHandler = asyncHandler(getConversationById);
export const postMessageToConversationHandler = asyncHandler(
  postMessageToConversation,
);
export const markConversationSeenHandler = asyncHandler(markConversationSeen);
export const toggleBlockConversationHandler = asyncHandler(
  toggleBlockConversation,
);
export const reportConversationHandler = asyncHandler(reportConversation);
