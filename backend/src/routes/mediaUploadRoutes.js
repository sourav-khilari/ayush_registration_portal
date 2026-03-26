import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeOriginalName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeOriginalName}`);
  },
});

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".mp4", ".webm"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "video/mp4",
  "video/webm",
]);

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (allowedExtensions.has(ext) && allowedMimeTypes.has(mime)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only jpg, jpeg, png, mp4, and webm files are allowed"));
};

const upload = multer({ storage, fileFilter });

router.post("/api/upload/media", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const isImage = req.file.mimetype.startsWith("image/");
  const fileType = isImage ? "image" : "video";

  return res.status(200).json({
    fileUrl: `/uploads/${req.file.filename}`,
    fileType,
  });
});

export default router;
