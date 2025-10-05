// src/models/DocumentRequirement.js
const mongoose = require("mongoose");

const RequirementItem = new mongoose.Schema(
  {
    doc_category: { type: String, required: true },
    required: { type: Boolean, default: true },
    note: { type: String },
    extract_fields: [{ name: String, label: String }],
  },
  { _id: false }
);

const DocumentRequirementSchema = new mongoose.Schema(
  {
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
    requirements: [RequirementItem],
  },
  { timestamps: true }
);

DocumentRequirementSchema.index(
  { sector: 1, application_type: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.DocumentRequirement ||
  mongoose.model("DocumentRequirement", DocumentRequirementSchema);
