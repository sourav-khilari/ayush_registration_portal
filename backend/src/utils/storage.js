const path = require("path");
const fs = require("fs").promises;
const pdf = require("pdf-poppler");
const sharp = require("sharp");

const uploadDir = process.env.UPLOAD_DIR || "public/uploads";

async function ensureUploadDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function uploadToLocal(tmpPath, filename) {
  const dateDir = new Date().toISOString().slice(0, 10);
  const destDir = path.join(uploadDir, dateDir);
  await ensureUploadDir(destDir);
  const destFilename = `${Date.now()}-${filename.replace(/\s+/g, "_")}`;
  const destPath = path.join(destDir, destFilename);
  await fs.copyFile(tmpPath, destPath);
  try {
    await fs.unlink(tmpPath);
  } catch (e) {}

  // Return a URL path that matches `app.use('/uploads', express.static(...))`
  // If uploadDir is 'public/uploads', return `/uploads/<date>/<file>`
  const parts = destPath.split(path.sep);
  // find index of 'uploads' in path
  const uploadsIndex = parts.lastIndexOf("uploads");
  const publicPath = "/" + parts.slice(uploadsIndex).join("/");
  return publicPath.replace(/\\/g, "/");
}

module.exports = { uploadToLocal };

// Resolve a stored public fileUrl (e.g., /uploads/2025-09-15/123-file.pdf)
// to an absolute filesystem path based on UPLOAD_DIR.
function resolveFileUrlToPath(fileUrl) {
  if (!fileUrl) return null;
  const normalized = fileUrl.replace(/\\/g, "/");
  const idx = normalized.indexOf("/uploads/");
  if (idx === -1) return null;
  const relative = normalized.slice(idx + "/uploads/".length);
  const absolute = path.join(uploadDir, relative);
  return absolute;
}

module.exports.resolveFileUrlToPath = resolveFileUrlToPath;

// Save a base64 image (data URL or raw base64) into uploads and return public URL
async function saveBase64Image(base64Input, suggestedName = "image.png") {
  const dateDir = new Date().toISOString().slice(0, 10);
  const destDir = path.join(uploadDir, dateDir);
  await ensureUploadDir(destDir);

  let mime = "image/png";
  let base64 = base64Input;
  const dataUrlMatch = /^data:(.+);base64,(.*)$/.exec(base64Input);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1] || mime;
    base64 = dataUrlMatch[2] || "";
  }

  const extFromMime = mime.split("/")[1] || "png";
  const safeName = `${Date.now()}-${suggestedName.replace(/\s+/g, "_")}`;
  const filename = safeName.includes(".") ? safeName : `${safeName}.${extFromMime}`;
  const destPath = path.join(destDir, filename);

  const buffer = Buffer.from(base64, "base64");
  await fs.writeFile(destPath, buffer);

  const parts = destPath.split(path.sep);
  const uploadsIndex = parts.lastIndexOf("uploads");
  const publicPath = "/" + parts.slice(uploadsIndex).join("/");
  return publicPath.replace(/\\/g, "/");
}

module.exports.saveBase64Image = saveBase64Image;

// Convert PDF to images and save them
async function convertPdfToImages(pdfPath, outputDir, baseName) {
  try {
    await ensureUploadDir(outputDir);
    
    const options = {
      format: 'png',
      out_dir: outputDir,
      out_prefix: baseName,
      page: null // Convert all pages
    };
    
    const result = await pdf.convert(pdfPath, options);
    return result;
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw error;
  }
}

// Process uploaded file and generate page images
async function processDocumentForImages(filePath, originalName) {
  const fileExt = path.extname(originalName).toLowerCase();
  const baseName = path.parse(originalName).name;
  const dateDir = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(uploadDir, dateDir, 'pages');
  
  let pageImages = [];
  
  if (fileExt === '.pdf') {
    // Convert PDF to images
    try {
      const result = await convertPdfToImages(filePath, outputDir, baseName);
      
      // Get all generated image files
      const files = await fs.readdir(outputDir);
      const imageFiles = files
        .filter(file => file.startsWith(baseName) && file.endsWith('.png'))
        .sort();
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = path.join(outputDir, imageFiles[i]);
        // Build public URL under /uploads/... similar to uploadToLocal
        const parts = imagePath.split(path.sep);
        const uploadsIndex = parts.lastIndexOf("uploads");
        const publicPath = "/" + parts.slice(uploadsIndex).join("/");
        pageImages.push({
          url: publicPath.replace(/\\/g, "/"),
          page: i + 1,
          filename: imageFiles[i]
        });
      }
    } catch (error) {
      console.error('PDF to images conversion failed:', error);
    }
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(fileExt)) {
    // Handle direct image uploads
    try {
      await ensureUploadDir(outputDir);
      
      // Normalize/convert to PNG using sharp for consistency
      const imagePath = path.join(outputDir, `${baseName}-page-1.png`);
      await sharp(filePath).png().toFile(imagePath);
      
      const parts = imagePath.split(path.sep);
      const uploadsIndex = parts.lastIndexOf("uploads");
      const publicPath = "/" + parts.slice(uploadsIndex).join("/");
      pageImages.push({
        url: publicPath.replace(/\\/g, "/"),
        page: 1,
        filename: `${baseName}-page-1.png`
      });
    } catch (error) {
      console.error('Image processing failed:', error);
    }
  }
  
  return pageImages;
}

module.exports.convertPdfToImages = convertPdfToImages;
module.exports.processDocumentForImages = processDocumentForImages;