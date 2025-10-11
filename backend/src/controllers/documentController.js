// src/controllers/documentController.js
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Document from "../models/Document.js";
import DocumentRequirement from "../models/DocumentRequirement.js";
import DocumentTemplate from "../models/DocumentTemplate.js";
import Application from "../models/Application.js";
import {
  uploadToLocal,
  resolveFileUrlToPath,
  saveBase64Image,
  processDocumentForImages,
} from "../utils/storage.js";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary manual verification support
const MANUAL_DOCS_DIR =
  process.env.MANUAL_DOCS_DIR ||
  path.join(
    __dirname,
    "..",
    "..",
    process.env.MANUAL_DOCS_FALLBACK_DIR || "manual_docs"
  );
// Fallback whitelist of known basenames (without extension)
const FALLBACK_ALLOWED_BASENAMES = (
  process.env.MANUAL_DOCS_WHITELIST || "Arnab_Ghosh_Aadhar,Arnab_Ghosh_Pan"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function listManualDocBasenamesSafe() {
  try {
    if (!MANUAL_DOCS_DIR) return [];
    const items = fs.readdirSync(MANUAL_DOCS_DIR, { withFileTypes: true });
    return items
      .filter((d) => d.isFile())
      .map((d) => path.parse(d.name).name)
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function normalizeNameForMatch(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "") // strip extension if present
    .replace(/[^a-z0-9]+/g, "_") // collapse non-alnum to underscore
    .replace(/^_+|_+$/g, ""); // trim underscores
}

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
    const {fileUrl,username }= await uploadToLocal(
      file.path,
      file.originalname,
      req?.user?.email || req.user.name || req.user.username
    );

    // Process document for page images (PDF to images or direct image handling)
    let pageImages = [];
    let pageCount = 0;
    try {
      // Use stored file's absolute path (tmp file is deleted by uploadToLocal)
      const storedAbsPath = resolveFileUrlToPath(fileUrl);
      pageImages = await processDocumentForImages(
        storedAbsPath,
        file.originalname,
        (username||req.user.name || req.user.username || "unknown")
          .replace(/\s+/g, "_")
          .toLowerCase()
      );

      pageCount = pageImages.length;
    } catch (error) {
      console.error("Page image processing failed:", error);
    }

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
      page_images: pageImages,
      page_count: pageCount,
    });

    // Temporary filename-based verification
    try {
      const uploadedBase = normalizeNameForMatch(file.originalname || "");
      const manualBasenames = listManualDocBasenamesSafe().map(
        normalizeNameForMatch
      );
      const allowedSet = new Set([
        ...manualBasenames,
        ...FALLBACK_ALLOWED_BASENAMES.map(normalizeNameForMatch),
      ]);
      if (uploadedBase && allowedSet.has(uploadedBase)) {
        doc.verified_status = "verified";
        await doc.save();
      } else {
        doc.verified_status = "rejected";
        doc.rejection_reason =
          "Filename did not match any manually stored document";
        await doc.save();
      }
    } catch (_) {}

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
          headers: {
            "Content-Type": "application/json",
            Authorization: process.env.OCR_API_KEY
              ? `Bearer ${process.env.OCR_API_KEY}`
              : undefined,
          },
          body: JSON.stringify({
            file_path: absPath,
            category: doc_category_declared,
          }),
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
        if (
          data.extracted_fields &&
          typeof data.extracted_fields === "object"
        ) {
          // Dynamic important fields per document type via external template API
          const raw = data.extracted_fields || {};
          const declaredCategory = String(
            doc.doc_category_declared || ""
          ).toLowerCase();
          const clientVariant = String(
            req.body.doc_variant || ""
          ).toLowerCase();
          const detectedVariant = String(
            data.detected_category || ""
          ).toLowerCase();
          const variant = clientVariant || detectedVariant || "";

          const getVal = (rec) =>
            rec && typeof rec === "object" && rec.value !== undefined
              ? rec.value
              : rec;

          let fieldsSpec = null;
          const baseUrl = process.env.DOC_TEMPLATE_API_URL;
          const apiKey = process.env.DOC_TEMPLATE_API_KEY;
          if (baseUrl) {
            try {
              const url = `${baseUrl}?doc_category=${encodeURIComponent(declaredCategory)}${variant ? `&variant=${encodeURIComponent(variant)}` : ""}`;
              const r = await fetch(url, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                },
              });
              if (r.ok) {
                const payload = await r.json();
                if (payload && Array.isArray(payload.fields)) {
                  fieldsSpec = payload.fields;
                }
              }
            } catch (_) {}
          }

          if (Array.isArray(fieldsSpec) && fieldsSpec.length) {
            // Keep only important fields defined by the template
            const out = {};
            for (const f of fieldsSpec) {
              const rec = raw[f.name];
              const val = getVal(rec);
              if (
                val !== undefined &&
                val !== null &&
                String(val).trim() !== ""
              ) {
                out[f.name] =
                  rec && typeof rec === "object"
                    ? { ...rec, value: val }
                    : { value: val };
              }
            }
            doc.extracted_fields = out;
          } else {
            // No template available: store OCR fields as-is
            doc.extracted_fields = raw;
          }
        }

        // OCR API will not generate images; keep page images generated during upload only

        // If OCR includes structured application fields, merge into the related Application
        if (
          doc.application_id &&
          data.application_fields &&
          typeof data.application_fields === "object"
        ) {
          try {
            const app = await Application.findById(doc.application_id);
            if (app) {
              const existing =
                app.application_data && typeof app.application_data === "object"
                  ? app.application_data
                  : {};
              app.application_data = {
                ...existing,
                ...data.application_fields,
              };
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

// List documents uploaded by the current user, optionally filtered by startup/application
async function listDocuments(req, res) {
  try {
    const { startup_id, application_id } = req.query;
    const filter = { uploaded_by: req.user._id };
    if (startup_id) filter.startup_id = startup_id;
    if (application_id) filter.application_id = application_id;

    const docs = await Document.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "filename fileUrl file_size doc_category_declared doc_category_detected category_confidence ocr_status ocr_text ocr_language extracted_fields verified_status page_images page_count createdAt updatedAt"
      )
      .lean();

    res.json({ documents: docs });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error listing documents", error: err.message });
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
    res
      .status(500)
      .json({ message: "Verification update failed", error: err.message });
  }
}

export {
  uploadDocumentHandler,
  getDocument,
  listDocuments,
  reassignDocument,
  getRequirements,
  setDocumentVerification,
};
