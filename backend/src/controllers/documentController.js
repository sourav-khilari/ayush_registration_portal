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
      const { ocrResults, extractedData: rawExtracted } =
        await processOCRAndExtract(pageImages, doc_category_declared);

      // Normalize extractedData object (ensure it's an object)
      const extractedData = rawExtracted || {};

      // Set OCR status based on results
      if (extractedData.ocr_failed || !ocrResults || ocrResults.length === 0) {
        doc.ocr_status = "failed";
        console.warn(`⚠️ OCR failed for document ${doc._id}`);

        // Persist whatever partial extractedData we have
        doc.extracted_fields = {};
        for (const [key, value] of Object.entries(extractedData || {})) {
          doc.extracted_fields[key] = { value };
        }

        doc.verified_status = "pending";
        await doc.save();

        // Return early — do not attempt verification if OCR failed
        return res.status(201).json({
          success: true,
          message:
            "Document uploaded but OCR failed — queued for manual review / retry.",
          document: doc,
        });
      } else {
        doc.ocr_status = "done";
      }

      // Save OCR text / extracted raw info (store raw for debugging)
      doc.ocr_text = extractedData;

      // Persist extracted_fields in Mongoose-friendly shape
      doc.extracted_fields = {};
      for (const [key, value] of Object.entries(extractedData || {})) {
        doc.extracted_fields[key] = { value };
      }

      // ---------------------- Verification Service ---------------------- //
      // Map document categories to verification API doc types
      const verificationTypeMap = {
        aadhar: "aadhaar",
        aadhaar: "aadhaar",
        pan: "pan",
        founder_pan: "pan",
        company_registration: "incorporation", // legacy corp/incorp mapping retained
        gst: "gst", // route to /verify/gst
        gst_certificate: "gst",
        address_proof: "utility-bill",
      };

      const normalizedDocType = (doc_category_declared || "")
        .toLowerCase()
        .trim();
      let verifyDocType = null;
      let extractedPayload = null;

      // Helper: validation before calling external verifier
      function hasAllKeys(obj, keys) {
        return keys.every(
          (k) =>
            obj &&
            obj[k] !== undefined &&
            obj[k] !== null &&
            String(obj[k]).trim() !== ""
        );
      }

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
          if (!hasAllKeys(extractedPayload, ["aadhaar_last4", "name"])) {
            console.log(
              `⚠️ Missing required fields for Aadhaar verification, skipping verification`
            );
            doc.verified_status = "pending";
            await doc.save();
            return res
              .status(201)
              .json({
                success: true,
                message: "Aadhaar fields missing; verification skipped",
                document: doc,
              });
          }
        } else if (extractedData.passport_no_masked) {
          verifyDocType = "passport";
          extractedPayload = {
            passport_no_masked: extractedData.passport_no_masked,
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };
          if (!hasAllKeys(extractedPayload, ["passport_no_masked", "name"])) {
            console.log(
              `⚠️ Missing required fields for Passport verification, skipping verification`
            );
            doc.verified_status = "pending";
            await doc.save();
            return res
              .status(201)
              .json({
                success: true,
                message: "Passport fields missing; verification skipped",
                document: doc,
              });
          }
        } else {
          console.log(
            `ℹ️ Founder ID document type not determined, skipping verification`
          );
          doc.verified_status = "pending";
          await doc.save();
          return res.status(201).json({
            success: true,
            message:
              "Document uploaded. Unable to determine founder ID type; verification skipped.",
            document: doc,
          });
        }
      } else if (verificationTypeMap[normalizedDocType]) {
        verifyDocType = verificationTypeMap[normalizedDocType];

        // Build payload based on document type
        if (verifyDocType === "aadhaar") {
          extractedPayload = {
            aadhaar_last4:
              extractedData.aadhaar_last4 ||
              (extractedData.document_number
                ? String(extractedData.document_number).slice(-4)
                : undefined),
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };

          if (!hasAllKeys(extractedPayload, ["aadhaar_last4", "name"])) {
            console.log(
              `⚠️ Missing required fields for Aadhaar verification, skipping verification`
            );
            doc.verified_status = "pending";
            await doc.save();
            return res
              .status(201)
              .json({
                success: true,
                message: "Aadhaar fields missing; verification skipped",
                document: doc,
              });
          }
        } else if (verifyDocType === "pan") {
          extractedPayload = {
            pan: extractedData.pan_number || extractedData.pan,
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };

          if (!hasAllKeys(extractedPayload, ["pan", "name"])) {
            console.log(
              `⚠️ Missing required fields for PAN verification, skipping verification`
            );
            doc.verified_status = "pending";
            await doc.save();
            return res
              .status(201)
              .json({
                success: true,
                message: "PAN fields missing; verification skipped",
                document: doc,
              });
          }
        } else if (verifyDocType === "utility-bill") {
          extractedPayload = {
            consumer_name: extractedData.consumer_name,
            consumer_account_no_masked:
              extractedData.consumer_account_no_masked,
            address: extractedData.address,
            billing_date: extractedData.billing_date,
            bill_type: extractedData.bill_type,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };

          if (
            !hasAllKeys(extractedPayload, [
              "consumer_name",
              "consumer_account_no_masked",
              "billing_date",
            ])
          ) {
            console.log(
              `⚠️ Missing required fields for utility bill verification, skipping verification`
            );
            doc.verified_status = "pending";
            await doc.save();
            return res
              .status(201)
              .json({
                success: true,
                message: "Utility bill fields missing; verification skipped",
                document: doc,
              });
          }
        } else if (verifyDocType === "gst") {
          // New: GST-specific payload shape expected by /verify/gst
          extractedPayload = {
            gstin:
              extractedData.gstin ||
              extractedData.reg_no ||
              extractedData.id_masked,
            legal_name:
              extractedData.legal_name ||
              extractedData.entity_name ||
              extractedData.canonical_name,
            registration_date:
              extractedData.registration_date ||
              extractedData.date_of_incorporation ||
              extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };

          if (
            !hasAllKeys(extractedPayload, [
              "gstin",
              "legal_name",
              "registration_date",
            ])
          ) {
            console.log(
              `⚠️ Missing required fields for GST verification, skipping verification`
            );
            doc.verified_status = "pending";
            await doc.save();
            return res.status(201).json({
              success: true,
              message: "GST fields missing; verification skipped",
              document: doc,
              mappedAttempt: extractedPayload,
            });
          }
        } else if (verifyDocType === "incorporation") {
          // Check if this is actually a GST certificate (has gstin field)
          if (extractedData.gstin) {
            // Route to GST verification instead
            verifyDocType = "gst";
            extractedPayload = {
              gstin: extractedData.gstin,
              legal_name: extractedData.legal_name || extractedData.entity_name,
              registration_date: extractedData.registration_date || extractedData.date_of_incorporation,
              ocr_confidence: extractedData.ocr_confidence || 0.8,
            };

            if (
              !hasAllKeys(extractedPayload, [
                "gstin",
                "legal_name",
                "registration_date",
              ])
            ) {
              console.log(
                `⚠️ Missing required fields for GST verification, skipping verification`
              );
              doc.verified_status = "pending";
              await doc.save();
              return res.status(201).json({
                success: true,
                message: "GST fields missing; verification skipped",
                document: doc,
              });
            }
          } else {
            // Regular incorporation verification
            extractedPayload = {
              reg_no: extractedData.reg_no,
              entity_name: extractedData.entity_name,
              date_of_incorporation: extractedData.date_of_incorporation,
              ocr_confidence: extractedData.ocr_confidence || 0.8,
            };

            if (
              !hasAllKeys(extractedPayload, [
                "reg_no",
                "entity_name",
                "date_of_incorporation",
              ])
            ) {
              console.log(
                `⚠️ Missing required fields for incorporation verification, skipping verification`
              );
              doc.verified_status = "pending";
              await doc.save();
              return res
                .status(201)
                .json({
                  success: true,
                  message: "Incorporation fields missing; verification skipped",
                  document: doc,
                });
            }
          }
        }
      } else {
        // unsupported doc type
        console.log(
          `ℹ️ Verification not supported for document type: ${doc_category_declared}`
        );
        doc.verified_status = "pending";
        await doc.save();
        return res.status(201).json({
          success: true,
          message:
            "Document uploaded. Verification not supported for this category.",
          document: doc,
        });
      }

      // Only attempt verification if we have a valid doc type and payload with required fields
      if (verifyDocType && extractedPayload) {
        const verifyBase =
          process.env.DOC_VER_API_BASE ||
          "https://doc-ver-service.onrender.com/api/v1/verify";
        // Map to correct endpoint - note: verifyDocType already holds endpoint suffix
        const verifyUrl = `${verifyBase}/${verifyDocType}`;

        console.log(`📡 Sending verification request to: ${verifyUrl}`);
        console.log("📦 Sending extracted payload:", extractedPayload);

        try {
          // Map to API doc_type value if required by remote API
          const docTypeMap = {
            aadhaar: "AADHAAR",
            pan: "PAN",
            incorporation: "INCORP",
            "utility-bill": "UTILITY",
            gst: "GST",
            passport: "PASSPORT",
          };
          const apiDocType =
            docTypeMap[verifyDocType] || verifyDocType.toUpperCase();

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
              verifyData?.status === "VERIFIED" ? "verified" : "rejected";
            doc.verification_response = verifyData;
            console.log("✅ Verification response:", verifyData);
          } else {
            const errorText = await verifyResp.text();
            console.warn(
              `❌ Verification service failed (${verifyResp.status}):`,
              errorText
            );
            doc.verified_status = "pending";
            doc.verification_response = {
              error: errorText,
              statusCode: verifyResp.status,
            };
          }
        } catch (verifyError) {
          console.warn("❌ Verification request failed:", verifyError.message);
          doc.verified_status = "pending";
          doc.verification_response = { error: verifyError.message };
        }
      } else {
        // no verification attempted
        doc.verified_status = doc.verified_status || "pending";
      }

      await doc.save();
    } catch (err) {
      console.error("OCR or Verification error:", err);
      doc.ocr_status = "failed";
      doc.verified_status = "pending";
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
