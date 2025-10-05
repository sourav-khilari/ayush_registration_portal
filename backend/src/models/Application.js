// src/models/Application.js
const mongoose = require("mongoose");

const ReviewHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "submitted",
        "assigned",
        "commented",
        "approved",
        "rejected",
        "reopened",
      ],
      required: true,
    },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    by_role: { type: String },
    comment: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ApplicationSchema = new mongoose.Schema(
  {
    startup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    sector: {
      type: String,
      enum: ["ayurveda", "yoga", "unani", "siddha", "homoeopathy"],
      required: true,
    },
    application_type: {
      type: String,
      enum: [
        "startup_registration",
        "manufacturing_own",
        "loan_license",
        "clinic",
        "training_center"
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "withdrawn",
      ],
      default: "draft",
      index: true,
    },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    application_data: { type: mongoose.Schema.Types.Mixed },
    assigned_official: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewer_comment: { type: String },
    review_history: [ReviewHistorySchema],
    submitted_at: { type: Date },
    decision_at: { type: Date },
    decision_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    required_status: { type: Map, of: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ✅ attach method after schema is defined
ApplicationSchema.methods.checkRequiredDocuments = async function (opts = {}) {
  const app = this;
  const DocumentRequirement = mongoose.model("DocumentRequirement");
  const docModel = mongoose.model("Document");

  const req = await DocumentRequirement.findOne({
    sector: app.sector,
    application_type: app.application_type,
  }).lean();
  if (!req) return { complete: false, missing: ["no-requirement-definition"] };

  const docs = await docModel
    .find({ application_id: app._id })
    .select("doc_category_declared doc_category_detected verified_status")
    .lean();

  const present = new Set(docs.map((d) => d.doc_category_declared));
  const missing = [];
  const details = [];

  for (const r of req.requirements) {
    const found = docs.find((d) => d.doc_category_declared === r.doc_category);
    if (!found) {
      if (r.required !== false) missing.push(r.doc_category);
      details.push({ category: r.doc_category, status: "missing" });
    } else if (opts.require_verified && found.verified_status !== "verified") {
      missing.push(r.doc_category);
      details.push({
        category: r.doc_category,
        status: "not_verified",
        detected: found.doc_category_detected,
      });
    } else {
      details.push({
        category: r.doc_category,
        status: "ok",
        detected: found.doc_category_detected,
      });
    }
  }

  return { complete: missing.length === 0, missing, details };
};

module.exports =
  mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);
