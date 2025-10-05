// src/models/Startup.js
const mongoose = require("mongoose");

const StartupSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    founder_name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone_number: { type: String },
    startup_type: { type: String },
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "inactive"],
      default: "pending",
      index: true,
    },
    description: { type: String },
    website: { type: String },
    address: { type: String },
    tags: [{ type: String }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applications: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    ],
  },
  { timestamps: true }
);

StartupSchema.index({ user_id: 1, status: 1 });

module.exports =
  mongoose.models.Startup || mongoose.model("Startup", StartupSchema);
