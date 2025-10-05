// src/models/Investor.js
const mongoose = require("mongoose");

const InvestorSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: { type: String },
    investment_sector: { type: String },
    phone_number: { type: String },
    bio: { type: String },
    website: { type: String },
    kyc_docs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
  },
  { timestamps: true }
);

InvestorSchema.index({ user_id: 1 });

module.exports =
  mongoose.models.Investor || mongoose.model("Investor", InvestorSchema);
