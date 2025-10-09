// src/models/DocumentTemplate.js
import mongoose from "mongoose";

const TemplateFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: String },
    required: { type: Boolean, default: true },
    // JS regex string, e.g., "^\\d{12}$" for Aadhaar number
    pattern: { type: String },
  },
  { _id: false }
);

const DocumentTemplateSchema = new mongoose.Schema(
  {
    // High-level category as used in uploads, e.g., "founder_id"
    doc_category: { type: String, required: true, index: true },
    // Specific variant, e.g., "aadhaar", "passport"
    variant: { type: String, required: true, index: true },
    fields: [TemplateFieldSchema],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DocumentTemplateSchema.index({ doc_category: 1, variant: 1 }, { unique: true });

export default
  mongoose.models.DocumentTemplate ||
  mongoose.model("DocumentTemplate", DocumentTemplateSchema);


