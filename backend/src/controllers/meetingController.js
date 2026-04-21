import MeetingRequest from "../models/MeetingRequest.js";
import Startup from "../models/Startup.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildICSInvite } from "../utils/ics.js";

// Create request
export const createRequest = async (req, res) => {
  try {
    if (req.user.role !== "investor" && req.user.role !== "startup_owner") {
      return res.status(403).json({ message: "Only investors and startup owners can request meetings" });
    }

    const { receiverId, startupId, proposed_slots, title, agenda, duration_minutes, timezone } = req.body || {};

    if (!receiverId || !startupId) {
      return res.status(400).json({ message: "receiverId and startupId are required" });
    }
    if (!Array.isArray(proposed_slots) || proposed_slots.length < 1) {
      return res.status(400).json({ message: "proposed_slots is required (at least 1 slot)" });
    }

    const startup = await Startup.findById(startupId).select("name user_id email founder_name").lean();
    if (!startup) return res.status(404).json({ message: "Startup not found" });

    // Role-based validation:
    // - Investor can request only the startup owner
    // - Startup owner can request only an investor
    if (req.user.role === "investor") {
      if (String(receiverId) !== String(startup.user_id)) {
        return res.status(403).json({ message: "Investor can request meeting only with the startup owner" });
      }
    }
    if (req.user.role === "startup_owner") {
      if (String(req.user.id) !== String(startup.user_id)) {
        return res.status(403).json({ message: "Startup owner can request meetings only for own startup" });
      }
      const receiver = await User.findById(receiverId).select("role").lean();
      if (!receiver) return res.status(404).json({ message: "Receiver not found" });
      if (receiver.role !== "investor") {
        return res.status(403).json({ message: "Startup owner can request meeting only with an investor" });
      }
    }

    // Keep internal room id for tracking
    const roomId = `meet-${startupId}-${Date.now()}`;

    const request = await MeetingRequest.create({
      senderId: req.user.id,
      receiverId,
      roomId,
      startupId,
      title: title || `Meeting with ${startup.name}`,
      agenda,
      duration_minutes: Number(duration_minutes || 30) || 30,
      timezone: timezone || "Asia/Kolkata",
      proposed_slots: proposed_slots.map((s) => new Date(s)),
    });

    // Notify receiver via email (best-effort) with proposed slots
    try {
      const receiver = await User.findById(receiverId).select("name email").lean();
      const slotLines = request.proposed_slots
        .slice(0, 6)
        .map((d, i) => `${i + 1}. ${new Date(d).toLocaleString()}`)
        .join("<br/>");
      if (receiver?.email) {
        await sendEmail({
          email: receiver.email,
          subject: `Meeting request for ${startup.name}`,
          message: `You have received a meeting request.`,
          html: `<p>Hello ${receiver.name || "Founder"},</p>
                <p><strong>${req.user.name || "A user"}</strong> requested a meeting for <strong>${startup.name}</strong>.</p>
                <p><strong>Proposed time slots:</strong><br/>${slotLines}</p>
                <p>Please login to AYUSH portal to accept a slot.</p>`,
        });
      }
    } catch (_) {}

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get incoming requests
export const getRequests = async (req, res) => {
  try {
    const requests = await MeetingRequest.find({
      receiverId: req.user.id,
      status: "pending",
    })
      .populate("senderId", "name email")
      .populate("startupId", "name founder_name email");

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Accept request
export const acceptRequest = async (req, res) => {
  try {
    const { slotIndex } = req.body || {};
    const request = await MeetingRequest.findById(req.params.id)
      .populate("senderId", "name email")
      .populate("receiverId", "name email")
      .populate("startupId", "name founder_name email");
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.receiverId?._id || request.receiverId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const idx = Number(slotIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= (request.proposed_slots || []).length) {
      return res.status(400).json({ message: "Valid slotIndex is required" });
    }

    request.status = "accepted";
    request.selected_slot = request.proposed_slots[idx];
    const googleMeetLink =
      process.env.DEFAULT_GOOGLE_MEET_LINK || "https://meet.google.com/new";
    request.google_meet_link = googleMeetLink;
    await request.save();

    // Send calendar invite to both parties (best-effort)
    try {
      const start = new Date(request.selected_slot);
      const end = new Date(start.getTime() + (request.duration_minutes || 30) * 60 * 1000);
      const meetingLink = request.google_meet_link;
      const ics = buildICSInvite({
        uid: `ayush-${request._id}@portal`,
        start,
        end,
        summary: request.title || "AYUSH Investor Meeting",
        description: request.agenda || `Meeting for startup ${request.startupId?.name || ""}`,
        organizerEmail: request.receiverId?.email,
        organizerName: request.receiverId?.name,
        attendees: [
          { email: request.senderId?.email, name: request.senderId?.name },
          { email: request.receiverId?.email, name: request.receiverId?.name },
        ],
        location: meetingLink,
      });

      const attach = [
        {
          filename: "ayush-meeting-invite.ics",
          content: ics,
          contentType: "text/calendar; charset=utf-8",
        },
      ];

      if (request.senderId?.email) {
        await sendEmail({
          email: request.senderId.email,
          subject: `Meeting confirmed: ${request.startupId?.name || "AYUSH Startup"}`,
          message: "Meeting confirmed.",
          html: `<p>Hello ${request.senderId.name || "Investor"},</p>
                <p>Your meeting request has been accepted.</p>
                <p><strong>Time:</strong> ${start.toLocaleString()}<br/>
                   <strong>Google Meet:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
                <p>The calendar invite is attached.</p>`,
          attachments: attach,
        });
      }
      if (request.receiverId?.email) {
        await sendEmail({
          email: request.receiverId.email,
          subject: `Meeting confirmed: ${request.startupId?.name || "AYUSH Startup"}`,
          message: "Meeting confirmed.",
          html: `<p>Hello ${request.receiverId.name || "Founder"},</p>
                <p>You confirmed a meeting.</p>
                <p><strong>Time:</strong> ${start.toLocaleString()}<br/>
                   <strong>Google Meet:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
                <p>The calendar invite is attached.</p>`,
          attachments: attach,
        });
      }
    } catch (e) {
      console.error("Failed to send meeting invite emails:", e?.message || e);
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject request
export const rejectRequest = async (req, res) => {
  try {
    const request = await MeetingRequest.findById(req.params.id);

    request.status = "rejected";
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get request status (for auto join)
export const getStatus = async (req, res) => {
  try {
    const request = await MeetingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      status: request.status,
      roomId: request.roomId,
      googleMeetLink: request.google_meet_link || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
