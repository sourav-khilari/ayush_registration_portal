// src/utils/storage.js
import path from "path";
import fs from "fs/promises";
import pdf from "pdf-poppler";
import sharp from "sharp";

const uploadDir = process.env.UPLOAD_DIR || "public/uploads";

// Ensure a folder exists
async function ensureUploadDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

// Upload file → /uploads/<username>/<date>/<filename>
export async function uploadToLocal(tmpPath, filename, username = "general") {
  // sanitize username for safe folder naming
  const safeUser = username.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
  const safeUserDir = `${safeUser}-${Date.now()}`;
  const destDir = path.join(uploadDir, safeUserDir);

  await ensureUploadDir(destDir);

  const destFilename = `${Date.now()}${filename.replace(/\s+/g, "_")}`;
  const destPath = path.join(destDir, destFilename);

  await fs.copyFile(tmpPath, destPath);
  try {
    await fs.unlink(tmpPath); // delete temp file
  } catch (e) {
    console.warn("Failed to delete temp file:", e);

  }

  // Generate /uploads/<username>/<file>
  const parts = destPath.split(path.sep);
  const uploadsIndex = parts.lastIndexOf("uploads");
  const publicPath = "/" + parts.slice(uploadsIndex).join("/");
  return {fileUrl:publicPath.replace(/\\/g, "/"),
    username:safeUserDir
  };
}

// Resolve a /uploads/... URL → filesystem path
export function resolveFileUrlToPath(fileUrl) {
  if (!fileUrl) return null;
  const normalized = fileUrl.replace(/\\/g, "/");
  const idx = normalized.indexOf("/uploads/");
  if (idx === -1) return null;
  const relative = normalized.slice(idx + "/uploads/".length);
  return path.join(uploadDir, relative);
}

// Save a base64 image inside user's folder
export async function saveBase64Image(
  base64Input,
  suggestedName = "image.png",
  username = "unknown"
) {
  const dateDir = new Date().toISOString().slice(0, 10);
  const destDir = path.join(uploadDir, username, dateDir);
  await ensureUploadDir(destDir);

  let mime = "image/png";
  let base64 = base64Input;
  const match = /^data:(.+);base64,(.*)$/.exec(base64Input);
  if (match) {
    mime = match[1] || mime;
    base64 = match[2] || "";
  }

  const ext = mime.split("/")[1] || "png";
  const safeName = `${Date.now()}-${suggestedName.replace(/\s+/g, "_")}`;
  const filename = safeName.includes(".") ? safeName : `${safeName}.${ext}`;
  const destPath = path.join(destDir, filename);

  await fs.writeFile(destPath, Buffer.from(base64, "base64"));
  return `/uploads/${username}/${dateDir}/${filename}`.replace(/\\/g, "/");
}

// Convert PDF to PNG pages
export async function convertPdfToImages(pdfPath, outputDir, baseName) {
  try {
    await ensureUploadDir(outputDir);
    const options = {
      format: "png",
      out_dir: outputDir,
      out_prefix: baseName,
      page: null,
    };
    await pdf.convert(pdfPath, options);
  } catch (err) {
    console.error("PDF conversion error:", err);
    throw err;
  }
}

// Convert a PDF or image to consistent page images and store inside user folder
export async function processDocumentForImages(
  filePath,
  originalName,
  username = "unknown"
) {
  const fileExt = path.extname(originalName).toLowerCase();
  const baseName = path.parse(originalName).name;
  const dateDir = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(uploadDir, username, "pages");
  await ensureUploadDir(outputDir);

  const pageImages = [];

  if (fileExt === ".pdf") {
    await convertPdfToImages(filePath, outputDir, baseName);
    const files = await fs.readdir(outputDir);
    const imageFiles = files
      .filter((f) => f.startsWith(baseName) && f.endsWith(".png"))
      .sort();

    imageFiles.forEach((file, i) => {
      pageImages.push({
        url: `/uploads/${username}/${dateDir}/pages/${file}`,
        page: i + 1,
        filename: file,
      });
    });
  } else if ([".jpg", ".jpeg", ".png", ".bmp", ".webp"].includes(fileExt)) {
    const dest = path.join(outputDir, `${baseName}-page-1.png`);
    await sharp(filePath).png().toFile(dest);
    pageImages.push({
      url: `/uploads/${username}/${dateDir}/pages/${baseName}-page-1.png`,
      page: 1,
      filename: `${baseName}-page-1.png`,
    });
  }

  return pageImages;
}
