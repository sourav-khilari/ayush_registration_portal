// src/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String },
    phone_number: { type: String },

    role: {
      type: String,
      enum: ["startup_owner", "investor", "gov_official", "admin", "user"],
      default: "user",
    },

    role_verified: {
      type: Boolean,
      default: function () {
        return this.role !== "gov_official";
      },
    },
    verification_docs: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    ],

    organization: { type: String },
    investment_sector: { type: String },
    designation: { type: String },
    department: { type: String },
    profile_meta: { type: mongoose.Schema.Types.Mixed },

    avatar_url: { type: String },
    last_login_at: { type: Date },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ name: "text", email: "text" });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
