// src/models/Barcode.js
const mongoose = require("mongoose");

const BarcodeSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    startup_id: { type: mongoose.Schema.Types.ObjectId, ref: "Startup" },
    jti: { type: String, required: true, unique: true },
    token: { type: String, required: true, unique: true },
    type: { type: String, enum: ["qr", "code128"], default: "qr" },
    image_url: { type: String },
    generated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["active", "revoked", "inactive"],
      default: "active",
    },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

BarcodeSchema.index({ product_id: 1 });
BarcodeSchema.index({ jti: 1 }, { unique: true });

module.exports =
  mongoose.models.Barcode || mongoose.model("Barcode", BarcodeSchema);
