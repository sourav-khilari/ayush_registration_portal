import mongoose from "mongoose";

const meetingRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    roomId: {
      type: String,
      required: true,
    },
    google_meet_link: { type: String },
    title: { type: String, default: "Investor Meeting" },
    agenda: { type: String },
    duration_minutes: { type: Number, default: 30 },
    timezone: { type: String, default: "Asia/Kolkata" },
    proposed_slots: [{ type: Date, required: true }],
    selected_slot: { type: Date },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export default mongoose.model("MeetingRequest", meetingRequestSchema);
