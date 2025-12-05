import path from "path";
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
import { processOCRAndExtract } from "../utils/ocrProcessor.js";

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

      // Use the OCR processing utility
      const { ocrResults, extractedData } = await processOCRAndExtract(
        pageImages,
        doc_category_declared
      );

      // Set OCR status based on results
      if (extractedData.ocr_failed || ocrResults.length === 0) {
        doc.ocr_status = "failed";
        console.warn(`⚠️ OCR failed for document ${doc._id}`);
      } else {
        doc.ocr_status = "done";
      }
      
      doc.ocr_results = ocrResults;

      // ✅ Wrap extracted fields properly to prevent Mongoose errors
      doc.extracted_fields = {};
      for (const [key, value] of Object.entries(extractedData)) {
        doc.extracted_fields[key] = { value };
      }

      // ---------------------- Verification Service ---------------------- //
      // Map document categories to verification API doc types
      const verificationTypeMap = {
        "aadhar": "aadhaar",
        "aadhaar": "aadhaar",
        "pan": "pan",
        "founder_pan": "pan",
        "company_registration": "incorporation",
        "address_proof": "utility-bill",
      };

      const normalizedDocType = doc_category_declared.toLowerCase().trim();
      let verifyDocType = null;
      let extractedPayload = null;

      // Handle founder_id separately (can be Aadhaar or Passport)
      if (normalizedDocType === "founder_id") {
        if (extractedData.aadhaar_last4) {
          verifyDocType = "aadhaar";
          extractedPayload = {
            aadhaar_last4: extractedData.aadhaar_last4,
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
        } else if (extractedData.passport_no_masked) {
          verifyDocType = "passport";
          extractedPayload = {
            passport_no_masked: extractedData.passport_no_masked,
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
        } else {
          console.log(`ℹ️ Founder ID document type not determined, skipping verification`);
          doc.verified_status = "pending";
          await doc.save();
          return;
        }
      } else if (verificationTypeMap[normalizedDocType]) {
        verifyDocType = verificationTypeMap[normalizedDocType];
        
        // Build payload based on document type
        if (verifyDocType === "aadhaar") {
          extractedPayload = {
            aadhaar_last4: extractedData.aadhaar_last4 || extractedData.document_number?.slice(-4),
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
        } else if (verifyDocType === "pan") {
          extractedPayload = {
            pan: extractedData.pan_number || extractedData.pan,
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
        } else if (verifyDocType === "incorporation") {
          extractedPayload = {
            reg_no: extractedData.reg_no,
            entity_name: extractedData.entity_name,
            date_of_incorporation: extractedData.date_of_incorporation,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
        } else if (verifyDocType === "utility-bill") {
          // Validate required fields for utility bill
          if (!extractedData.billing_date) {
            console.log(`⚠️ Missing required field 'billing_date' for utility bill, skipping verification`);
            doc.verified_status = "pending";
            await doc.save();
            return;
          }
          extractedPayload = {
            consumer_name: extractedData.consumer_name,
            consumer_account_no_masked: extractedData.consumer_account_no_masked,
            address: extractedData.address,
            billing_date: extractedData.billing_date,
            bill_type: extractedData.bill_type,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
        } else if (verifyDocType === "incorporation") {
          // Validate required fields for incorporation
          if (!extractedData.reg_no) {
            console.log(`⚠️ Missing required field 'reg_no' for incorporation, skipping verification`);
            doc.verified_status = "pending";
            await doc.save();
            return;
          }
          extractedPayload = {
            reg_no: extractedData.reg_no,
            entity_name: extractedData.entity_name,
            date_of_incorporation: extractedData.date_of_incorporation,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
        }
      }

      // Only attempt verification if we have a valid doc type and payload with required fields
      if (verifyDocType && extractedPayload) {
        // Additional validation: check for undefined/null required fields
        const hasUndefinedFields = Object.values(extractedPayload).some(
          (val) => val === undefined || val === null
        );
        
        if (hasUndefinedFields && (verifyDocType === "pan" || verifyDocType === "aadhaar")) {
          // For PAN and Aadhaar, if key fields are missing, skip verification
          const requiredFields = verifyDocType === "pan" 
            ? ["pan", "name"] 
            : ["aadhaar_last4", "name"];
          const missingFields = requiredFields.filter(
            (field) => !extractedPayload[field]
          );
          
          if (missingFields.length > 0) {
            console.log(`⚠️ Missing required fields [${missingFields.join(", ")}] for ${verifyDocType}, skipping verification`);
            doc.verified_status = "pending";
            await doc.save();
            return;
          }
        }
        const verifyUrl = `${process.env.DOC_VER_API_BASE}/${verifyDocType}`;
        console.log(`📡 Sending verification request to: ${verifyUrl}`);

        console.log("📦 Sending extracted payload:", extractedPayload);

        try {
          // Map to API doc_type format
          const docTypeMap = {
            "aadhaar": "AADHAAR",
            "pan": "PAN",
            "incorporation": "INCORP",
            "utility-bill": "UTILITY",
            "passport": "PASSPORT",
          };
          const apiDocType = docTypeMap[verifyDocType] || verifyDocType.toUpperCase();

          const verifyResp = await fetch(verifyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.DOC_VER_API_KEY,
            },
            body: JSON.stringify({
              request_id: `req-${doc._id}`,
              submitted_by: req.user.email || "unknown",
              doc_type: apiDocType,
              extracted: extractedPayload,
            }),
          });

          if (verifyResp.ok) {
            const verifyData = await verifyResp.json();
            doc.verified_status =
              verifyData?.verified === true ? "verified" : "rejected";
            doc.verification_response = verifyData;
            console.log("✅ Verification response:", verifyData);
          } else {
            const errorText = await verifyResp.text();
            console.warn(`❌ Verification service failed (${verifyResp.status}):`, errorText);
            doc.verified_status = "pending";
          }
        } catch (verifyError) {
          console.warn("❌ Verification request failed:", verifyError.message);
          doc.verified_status = "pending";
        }
      } else {
        console.log(`ℹ️ Verification not supported for document type: ${doc_category_declared}`);
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
