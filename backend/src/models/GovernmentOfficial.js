// src/models/GovernmentOfficial.js
const mongoose = require("mongoose");

const GovOfficialSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    official_id: { type: String, unique: true, sparse: true },
    designation: { type: String },
    department: { type: String },
    phone_number: { type: String },
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verified_at: { type: Date },
    verification_docs: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);

GovOfficialSchema.index({ user_id: 1 });

module.exports =
  mongoose.models.GovernmentOfficial ||
  mongoose.model("GovernmentOfficial", GovOfficialSchema);
