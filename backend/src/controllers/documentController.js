import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { fileURLToPath } from "url";
import Document from "../models/Document.js";
import DocumentRequirement from "../models/DocumentRequirement.js";
import Application from "../models/Application.js";
import {
  uploadToLocal,
  resolveFileUrlToPath,
  processDocumentForImages,
} from "../utils/storage.js";
import fetch from "node-fetch";
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  AppError,
} from "../middleware/errorHandler.js";
import { getExtractor } from "../extractors/index.js"; // 👈 extractor router

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- Upload & Process Document ---------------------- //
async function handleUploadDocument(req, res) {
  const file = req.file;
  if (!file) throw new ValidationError("File is required");

  const {
    application_id,
    startup_id,
    doc_category_declared,
    document_name,
    description,
  } = req.body;

  if (!doc_category_declared)
    throw new ValidationError("doc_category_declared is required");

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.mimetype))
    throw new ValidationError("Only PDF, JPEG, and PNG files are allowed");

  try {
    // Step 1: Save the file locally
    const { fileUrl, username } = await uploadToLocal(
      file.path,
      file.originalname,
      req?.user?.email || req.user.name || req.user.username
    );

    // Step 2: Convert to page images (for OCR)
    let pageImages = [];
    try {
      const storedAbsPath = resolveFileUrlToPath(fileUrl);
      pageImages = await processDocumentForImages(
        storedAbsPath,
        file.originalname,
        username
      );
    } catch (err) {
      console.error("Page image processing failed:", err);
    }

    // Step 3: Save initial document entry
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
      ocr_status: "pending",
      page_images: pageImages,
      page_count: pageImages.length,
    });

    if (application_id) {
      await Application.findByIdAndUpdate(application_id, {
        $addToSet: { documents: doc._id },
      });
    }

    // ---------------------- OCR + Extraction ---------------------- //
    try {
      doc.ocr_status = "processing";
      await doc.save();

      const ocrResults = [];
      let allText = [];

      for (const img of pageImages) {
        const absPath = path.join(
          process.cwd(),
          "public",
          img.url.replace(/^\/uploads\//, "uploads/")
        );

        if (!fs.existsSync(absPath)) {
          console.warn(`⚠️ Image not found: ${absPath}`);
          continue;
        }

        const form = new FormData();
        form.append("image", fs.createReadStream(absPath));

        console.log(`🔍 Sending OCR for: ${absPath}`);

        const response = await axios.post(process.env.OCR_API_URL, form, {
          headers: form.getHeaders(),
        });

        console.log("✅ OCR Response:", response.data);

        const textArray = Array.isArray(response.data.text)
          ? response.data.text
          : [String(response.data.text)];

        ocrResults.push({
          image: path.basename(absPath),
          result: { text: textArray },
        });

        allText.push(...textArray);
      }

      doc.ocr_status = "done";
      doc.ocr_results = ocrResults;

      // ---------------------- Extract Key Fields ---------------------- //
      const extractorFn = getExtractor(doc_category_declared);
      let extractedData = {};

      if (extractorFn) {
        extractedData = extractorFn(allText);
        console.log(
          `🧩 Extracted fields for ${doc_category_declared}:`,
          extractedData
        );
      } else {
        extractedData = { text: allText.join(" "), ocr_confidence: 0.8 };
        console.log(`⚠️ No extractor found for ${doc_category_declared}`);
      }

      // ✅ Wrap extracted fields properly to prevent Mongoose errors
      doc.extracted_fields = {};
      for (const [key, value] of Object.entries(extractedData)) {
        doc.extracted_fields[key] = { value };
      }

      // ---------------------- Verification Service ---------------------- //
      const docType = doc_category_declared.toUpperCase();
      const verifyUrl = `${process.env.DOC_VER_API_BASE}/${docType.toLowerCase()}`;

      console.log(`📡 Sending verification request to: ${verifyUrl}`);

      const verifyResp = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.DOC_VER_API_KEY,
        },
        body: JSON.stringify({
          request_id: `req-${doc._id}`,
          submitted_by: req.user.email || "unknown",
          doc_type: docType,
          extracted: extractedData,
        }),
      });

      if (verifyResp.ok) {
        const verifyData = await verifyResp.json();
        doc.verified_status =
          verifyData?.verified === true ? "verified" : "rejected";
        doc.verification_response = verifyData;
        console.log("✅ Verification response:", verifyData);
      } else {
        console.warn("❌ Verification service failed:", verifyResp.status);
        doc.verified_status = "pending";
      }

      await doc.save();
    } catch (err) {
      console.error("OCR or Verification error:", err);
      doc.ocr_status = "failed";
      await doc.save();
    }

    res.status(201).json({
      success: true,
      message: "Document uploaded and processed successfully",
      document: doc,
    });
  } catch (error) {
    console.error("Upload error:", error);
    throw new AppError("Document upload failed", 500);
  }
}

// ---------------------- Get Single Document ---------------------- //
async function getDocument(req, res) {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new NotFoundError("Document not found");
  res.json({ success: true, document: doc });
}

// ---------------------- List Documents ---------------------- //
async function listDocuments(req, res) {
  const { startup_id, application_id } = req.query;
  const filter = { uploaded_by: req.user._id };
  if (startup_id) filter.startup_id = startup_id;
  if (application_id) filter.application_id = application_id;

  const docs = await Document.find(filter)
    .sort({ createdAt: -1 })
    .select(
      "filename fileUrl file_size doc_category_declared verified_status ocr_status extracted_fields createdAt"
    )
    .lean();

  res.json({ success: true, documents: docs });
}

// ---------------------- Reassign Document Category ---------------------- //
async function reassignDocument(req, res) {
  const { new_category } = req.body;
  if (!new_category) throw new ValidationError("new_category is required");

  const doc = await Document.findById(req.params.id);
  if (!doc) throw new NotFoundError("Document not found");

  const old = doc.doc_category_declared;
  doc.doc_category_declared = new_category;
  doc.mismatch_flag =
    doc.doc_category_detected &&
    doc.doc_category_detected !== new_category &&
    doc.category_confidence >= 0.75;
  await doc.save();

  res.json({
    success: true,
    message: "Document category updated",
    old,
    document: doc,
  });
}

// ---------------------- Get Document Requirements ---------------------- //
async function getRequirements(req, res) {
  const { sector, application_type } = req.query;
  if (!sector || !application_type)
    throw new ValidationError("sector and application_type are required");

  const reqDoc = await DocumentRequirement.findOne({
    sector: sector.toLowerCase(),
    application_type: application_type.toLowerCase(),
  }).lean();

  if (!reqDoc) throw new NotFoundError("Document requirements not found");
  res.json({ success: true, requirements: reqDoc });
}

// ---------------------- Manual Verification by Officials ---------------------- //
async function setDocumentVerification(req, res) {
  const { status, reason } = req.body;
  if (!status || !["verified", "rejected"].includes(status))
    throw new ValidationError("Invalid status");

  const doc = await Document.findById(req.params.id);
  if (!doc) throw new NotFoundError("Document not found");

  doc.verified_status = status;
  doc.rejection_reason = status === "rejected" ? reason || "" : undefined;
  doc.verified_by = req.user._id;
  doc.verified_at = new Date();
  await doc.save();

  res.json({
    success: true,
    message: "Document verification updated successfully",
    document: doc,
  });
}

// ---------------------- Exports ---------------------- //
export const uploadDocumentHandler = asyncHandler(handleUploadDocument);
export const getDocumentHandler = asyncHandler(getDocument);
export const listDocumentsHandler = asyncHandler(listDocuments);
export const reassignDocumentHandler = asyncHandler(reassignDocument);
export const getRequirementsHandler = asyncHandler(getRequirements);
export const setDocumentVerificationHandler = asyncHandler(
  setDocumentVerification
);
