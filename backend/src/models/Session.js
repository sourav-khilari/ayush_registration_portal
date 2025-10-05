const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema(
  {
    // general session data
    session_type: { type: String, enum: ["chat", "video"], default: "chat" },
    startup_id: { type: mongoose.Schema.Types.ObjectId, ref: "Startup" }, // helpful context
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // owner, investor, gov official, etc.
    started_at: { type: Date, default: Date.now },
    ended_at: { type: Date },
    session_meta: { type: mongoose.Schema.Types.Mixed }, // e.g., meeting link, recording id, room id
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);
