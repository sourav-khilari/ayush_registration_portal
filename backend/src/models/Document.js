// src/models/Document.js
const mongoose = require("mongoose");

const DocumentVersionSchema = new mongoose.Schema(
  {
    fileUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    uploaded_at: { type: Date, default: Date.now },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const ExtractFieldSchema = new mongoose.Schema(
  {
    value: { type: mongoose.Schema.Types.Mixed },
    confidence: { type: Number },
    page: { type: Number },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    application_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    },
    startup_id: { type: mongoose.Schema.Types.ObjectId, ref: "Startup" },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // declared by user
    doc_category_declared: { type: String, required: true },
    // classifier result
    doc_category_detected: { type: String },
    category_confidence: { type: Number },

    document_name: { type: String, required: true },
    doc_category: { type: String }, // convenience: for backward compat (not required)
    description: { type: String },

    fileUrl: { type: String, required: true },
    filename: { type: String },
    file_size: { type: Number },

    ocr_status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
    },
    ocr_text: { type: String },
    ocr_language: { type: String },

    extracted_fields: { type: Map, of: ExtractFieldSchema },
    extraction_version: { type: String },

    verified_status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verified_at: { type: Date },
    rejection_reason: { type: String },

    versions: [DocumentVersionSchema],
    page_count: { type: Number },
    page_images: [
      new mongoose.Schema(
        {
          url: { type: String, required: true },
          page: { type: Number },
          width: { type: Number },
          height: { type: Number },
        },
        { _id: false }
      ),
    ],
    checksum: { type: String },
    mismatch_flag: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

DocumentSchema.index({ application_id: 1 });
DocumentSchema.index({ startup_id: 1 });
DocumentSchema.index({ doc_category_declared: 1 });

module.exports =
  mongoose.models.Document || mongoose.model("Document", DocumentSchema);
