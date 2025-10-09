// src/models/Product.js
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    product_name: { type: String, required: true },
    category: { type: String },
    product_price: { type: Number, required: true },
    approval_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    startup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    barcode_id: { type: mongoose.Schema.Types.ObjectId, ref: "Barcode" },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
