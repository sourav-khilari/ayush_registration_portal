// src/models/MetricEntry.js
import mongoose from "mongoose";

const MetricEntrySchema = new mongoose.Schema(
  {
    startupId: {
      type: String,
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
    },
    revenue: {
      type: Number,
      default: 0,
    },
    users: {
      type: Number,
      default: 0,
    },
    paying_customers: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate month entries per startup
MetricEntrySchema.index({ startupId: 1, month: 1 }, { unique: true });

export default mongoose.models.MetricEntry || mongoose.model("MetricEntry", MetricEntrySchema);
