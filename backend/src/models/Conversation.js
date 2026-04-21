import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender_role: { type: String },
    text: { type: String, default: "" },
    attachment: {
      url: { type: String },
      name: { type: String },
      mimeType: { type: String },
      size: { type: Number },
    },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ConversationSchema = new mongoose.Schema(
  {
    startup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    // Unique key for startup + investor conversation
    participants_key: { type: String, index: true },
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    blocked_by: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reports: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    messages: [MessageSchema],
  },
  { timestamps: true }
);

ConversationSchema.index({ startup_id: 1 });
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ startup_id: 1, participants_key: 1 }, { unique: true, sparse: true });

ConversationSchema.pre("validate", function (next) {
  if (this.participants && this.participants.length) {
    const ids = this.participants.map((p) => String(p)).sort();
    this.participants_key = ids.join("_");
  }
  next();
});

export default
  mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);

