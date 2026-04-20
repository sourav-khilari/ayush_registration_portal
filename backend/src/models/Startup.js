// src/models/Startup.js
import mongoose from "mongoose";

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
    /**
     * Optional investor-facing metadata.
     * These fields are non-required so they won't break existing records.
     */
    location: { type: String }, // City / region for filtering
    financial_status: {
      type: String,
      enum: ["profit", "loss", "break_even"],
    },
    revenue: { type: Number }, // Latest annual revenue in INR (or chosen currency)
    revenue_history: [
      {
        year: Number,
        value: Number,
      },
    ],
    // When a government official/admin last changed the status
    status_updated_at: { type: Date },
    /** Monthly revenue for line chart: [{ period: "2025-01", value: Number }] */
    revenue_monthly: [
      { period: String, value: Number },
    ],
    profit_loss: { type: Number }, // Profit or loss (negative = loss) in INR
    expenses: { type: Number }, // Total expenses in INR
    /** Expense breakdown for pie chart */
    expenses_breakdown: [
      { category: String, amount: Number },
    ],
    funding_raised: { type: Number }, // Total funding raised in INR
    burn_rate: { type: Number }, // Monthly burn rate in INR
    valuation: { type: Number }, // Optional valuation in INR
    // Certificate fields (generated on approval)
    certificate_id: { type: String, index: true },
    certificate_hash: { type: String },
    certificate_url: { type: String },
    certificate_issued_at: { type: Date },
    tags: [{ type: String }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applications: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    ],
  },
  { timestamps: true }
);

StartupSchema.index({ user_id: 1, status: 1 });

export default
  mongoose.models.Startup || mongoose.model("Startup", StartupSchema);
