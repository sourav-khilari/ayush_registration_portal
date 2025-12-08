// src/routes/productRoutes.js
import express from "express";
import multer from "multer";
import { verifyProductQrHandler } from "../controllers/productController.js";

const router = express.Router();

// Use memoryStorage (recommended for small QR images)
const upload = multer({ storage: multer.memoryStorage() });

// Route that your frontend/curl calls
router.post("/verify-image", upload.single("image"), verifyProductQrHandler);

export default router;
