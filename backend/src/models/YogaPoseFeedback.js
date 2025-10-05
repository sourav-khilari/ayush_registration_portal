const mongoose = require("mongoose");

const YogaPoseFeedbackSchema = new mongoose.Schema(
  {
    tutorial_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "YogaTutorial",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    feedback: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    submitted_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.YogaPoseFeedback ||
  mongoose.model("YogaPoseFeedback", YogaPoseFeedbackSchema);
