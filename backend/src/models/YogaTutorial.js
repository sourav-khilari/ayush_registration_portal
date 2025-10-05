const mongoose = require("mongoose");

const YogaTutorialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    video_url: { type: String, required: true },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who uploaded
    uploaded_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.YogaTutorial ||
  mongoose.model("YogaTutorial", YogaTutorialSchema);
