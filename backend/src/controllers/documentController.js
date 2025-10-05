// src/controllers/documentController.js
const path = require("path");
const Document = require("../models/Document");
const DocumentRequirement = require("../models/DocumentRequirement");
const Application = require("../models/Application");
const { uploadToLocal, resolveFileUrlToPath, saveBase64Image } = require("../utils/storage");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function uploadDocumentHandler(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File required" });

    const {
      application_id,
      startup_id,
      doc_category_declared,
      document_name,
      description,
    } = req.body;

    if (!doc_category_declared) {
      return res
        .status(400)
        .json({ message: "doc_category_declared is required" });
    }

    // save file locally (for now)
    const fileUrl = await uploadToLocal(file.path, file.originalname);

    const doc = await Document.create({
      application_id: application_id || null,
      startup_id: startup_id || null,
      uploaded_by: req.user._id,
      doc_category_declared,
      document_name: document_name || file.originalname,
      description,
      fileUrl,
      filename: file.originalname,
      file_size: file.size,
      ocr_status: "pending", // still keep status, but not processing yet
    });

    if (application_id) {
      await Application.findByIdAndUpdate(application_id, {
        $addToSet: { documents: doc._id },
      });
    }

    // Optional OCR integration if configured
    if (process.env.OCR_API_URL) {
      try {
        doc.ocr_status = "processing";
        await doc.save();

        const absPath = resolveFileUrlToPath(fileUrl);
        const resp = await fetch(process.env.OCR_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: process.env.OCR_API_KEY ? `Bearer ${process.env.OCR_API_KEY}` : undefined },
          body: JSON.stringify({ file_path: absPath, category: doc_category_declared }),
        });
        if (!resp.ok) throw new Error(`OCR HTTP ${resp.status}`);
        const data = await resp.json();

        // Persist OCR outputs if present
        if (data.text) doc.ocr_text = data.text;
        if (data.language) doc.ocr_language = data.language;
        if (data.detected_category) {
          doc.doc_category_detected = data.detected_category;
          if (typeof data.category_confidence === "number") {
            doc.category_confidence = data.category_confidence;
          }
        }
        if (data.extracted_fields && typeof data.extracted_fields === "object") {
          doc.extracted_fields = data.extracted_fields;
        }

        // Save page images if OCR returns them (as base64 data URLs or raw base64)
        // Supports keys: page_images | pages | images
        const pageImages = Array.isArray(data.page_images)
          ? data.page_images
          : Array.isArray(data.pages)
          ? data.pages
          : Array.isArray(data.images)
          ? data.images
          : [];
        if (pageImages.length > 0) {
          const saved = [];
          for (let i = 0; i < pageImages.length; i++) {
            const img = pageImages[i];
            try {
              const url = await saveBase64Image(img, `${path.parse(file.originalname).name}-p${i + 1}.png`);
              saved.push({ url, page: i + 1 });
            } catch (_) {}
          }
          if (saved.length) {
            doc.page_images = saved;
            doc.page_count = saved.length;
          }
        }

        // If OCR includes structured application fields, merge into the related Application
        if (doc.application_id && data.application_fields && typeof data.application_fields === "object") {
          try {
            const app = await Application.findById(doc.application_id);
            if (app) {
              const existing = app.application_data && typeof app.application_data === "object" ? app.application_data : {};
              app.application_data = { ...existing, ...data.application_fields };
              await app.save();
            }
          } catch (_) {}
        }
        doc.ocr_status = "done";
        await doc.save();
      } catch (ocrErr) {
        console.error("OCR error:", ocrErr);
        try {
          doc.ocr_status = "failed";
          await doc.save();
        } catch (_) {}
      }
    }

    res.status(201).json({ message: "Uploaded", document: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
}

async function getDocument(req, res) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching document", error: err.message });
  }
}

async function reassignDocument(req, res) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    const { new_category } = req.body;
    const old = doc.doc_category_declared;

    doc.doc_category_declared = new_category;
    doc.mismatch_flag =
      doc.doc_category_detected &&
      doc.doc_category_detected !== new_category &&
      doc.category_confidence >= 0.75;

    await doc.save();

    res.json({ message: "Reassigned", document: doc, old });
  } catch (err) {
    res.status(500).json({ message: "Reassign failed", error: err.message });
  }
}

async function getRequirements(req, res) {
  try {
    const { sector, application_type } = req.query;
    if (!sector || !application_type) {
      return res
        .status(400)
        .json({ message: "sector and application_type are required" });
    }

    const reqDoc = await DocumentRequirement.findOne({
      sector: String(sector).toLowerCase(),
      application_type: String(application_type).toLowerCase(),
    }).lean();

    if (!reqDoc) {
      return res.status(404).json({ message: "No requirement defined" });
    }

    return res.json(reqDoc);
  } catch (err) {
    console.error("getRequirements error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch requirements", error: err.message });
  }
}

// For officials to verify/reject a document
async function setDocumentVerification(req, res) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    const { status, reason } = req.body; // status: 'verified' | 'rejected'
    if (!status || !["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    doc.verified_status = status;
    doc.rejection_reason = status === "rejected" ? reason || "" : undefined;
    doc.verified_by = req.user._id;
    doc.verified_at = new Date();
    await doc.save();
    res.json({ message: "Verification updated", document: doc });
  } catch (err) {
    res.status(500).json({ message: "Verification update failed", error: err.message });
  }
}

module.exports = { uploadDocumentHandler, getDocument, reassignDocument, getRequirements, setDocumentVerification };
