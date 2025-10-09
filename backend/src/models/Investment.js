// src/models/Investment.js
import mongoose from "mongoose";

const InvestmentSchema = new mongoose.Schema(
  {
    startup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    investor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Investor",
      required: true,
    },
    amount: { type: Number, required: true },
    stake_percentage: { type: Number },
    investment_type: { type: String },
    status: {
      type: String,
      enum: ["pending", "completed", "rejected"],
      default: "pending",
    },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default
  mongoose.models.Investment || mongoose.model("Investment", InvestmentSchema);
