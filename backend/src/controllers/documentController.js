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
import crypto from "crypto";
import VerificationOTP from "../models/VerificationOTP.js";
import { sendEmail } from "../utils/sendEmail.js";

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
    console.log("doc=\n"+doc)
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

// ---------------------- Replace Rejected Document ---------------------- //
async function replaceRejectedDocument(req, res) {
  const file = req.file;
  if (!file) throw new ValidationError("File is required");

  const docId = req.params.id;
  const doc = await Document.findById(docId);
  if (!doc) throw new NotFoundError("Document not found");

  // Verify ownership - user must own the document
  if (String(doc.uploaded_by) !== String(req.user._id)) {
    throw new AppError("Not authorized to replace this document", 403);
  }

  // Only allow replacement if document is rejected
  if (doc.verified_status !== "rejected") {
    throw new ValidationError("Document can only be replaced if it is rejected");
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.mimetype))
    throw new ValidationError("Only PDF, JPEG, and PNG files are allowed");

  try {
    // Save old version to versions array
    if (!doc.versions) doc.versions = [];
    doc.versions.push({
      fileUrl: doc.fileUrl,
      fileName: doc.filename,
      fileSize: doc.file_size,
      uploaded_at: doc.updatedAt || doc.createdAt,
      uploaded_by: doc.uploaded_by,
    });

    // Upload new file
    const { fileUrl, username } = await uploadToLocal(
      file.path,
      file.originalname,
      req?.user?.email || req.user.name || req.user.username
    );

    // Convert to page images
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

    // Update document with new file
    doc.fileUrl = fileUrl;
    doc.filename = file.originalname;
    doc.document_name = req.body.document_name || file.originalname;
    doc.file_size = file.size;
    doc.page_images = pageImages;
    doc.page_count = pageImages.length;
    doc.ocr_status = "pending";
    doc.verified_status = "pending"; // Reset verification status
    doc.rejection_reason = undefined; // Clear rejection reason
    doc.verified_by = undefined;
    doc.verified_at = undefined;

    await doc.save();

    // Process OCR and extraction in background (same as upload)
    try {
      doc.ocr_status = "processing";
      await doc.save();

      const { ocrResults, extractedData } = await processOCRAndExtract(
        pageImages,
        doc.doc_category_declared
      );

      if (extractedData.ocr_failed || ocrResults.length === 0) {
        doc.ocr_status = "failed";
      } else {
        doc.ocr_status = "done";
      }

      doc.ocr_results = ocrResults;
      doc.extracted_fields = {};
      for (const [key, value] of Object.entries(extractedData)) {
        doc.extracted_fields[key] = { value };
      }

      await doc.save();
    } catch (err) {
      console.error("OCR processing error:", err);
      doc.ocr_status = "failed";
      await doc.save();
    }
    
    res.json({
      success: true,
      message: "Document replaced successfully. Verification will be processed.",
      document: doc,
    });
  } catch (error) {
    console.error("Replace document error:", error);
    throw new AppError("Document replacement failed", 500);
  }
}



// ---------------------- Email-lookup & OTP ---------------------- //
async function handleEmailLookup(req, res) {
  console.log("handleEmailLookup called");
  console.log("req.body =", req?.body);
  const { masked_id } = req?.body;
  if (!masked_id) throw new ValidationError("masked_id is required");

  const last4 = masked_id.slice(-4);
  const windowMinutes = parseInt(process.env.EMAIL_LOOKUP_WINDOW_MINUTES || "10", 10);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  // Look for a recently uploaded, OCR-done and VERIFIED document that contains the last4
  const doc = await Document.findOne({
    ocr_status: "done",
    verified_status: "verified",
    createdAt: { $gte: since },
    $or: [
      // { "extracted_fields.aadhaar_last4.value": last4 },
      // { "extracted_fields.aadhaar_last4": last4 },
      // { "extracted_fields.document_number.value": { $regex: last4 + "$" } },
      // { "extracted_fields.document_number": { $regex: last4 + "$" } },
      { "ocr_text.aadhaar_last4": last4 },
    ],
  }).lean();

  if (!doc) throw new NotFoundError("No recently verified document found for provided id");

  const lookupUrl = process.env.EMAIL_LOOKUP_URL || "http://localhost:8000/api/v1/email-lookup";

  // Call external email-lookup service
  const resp = await fetch(lookupUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aadhar_last4: last4 }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.warn("Email lookup failed:", resp.status, text);
    throw new AppError("Email lookup service failed", 502);
  }

  const data = await resp.json();
  const email = data?.data?.email;
  if (!email) throw new AppError("Email not found from lookup service", 502);

  // Generate OTP and persist
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await VerificationOTP.create({
    email,
    otp_hash: otpHash,
    doc_id: doc._id,
    expiresAt,
    meta: { masked_id, lookup: data?.data },
  });

  // Send OTP by email (simple text message)
  try {
    await sendEmail({
      email,
      subject: "Your OTP code",
      message: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    });
  } catch (err) {
    console.warn("Failed to send OTP email:", err.message);
    // continue — OTP persisted; caller can retry sending if needed
  }

  // Return masked email for UX (do not expose full address if you prefer)
  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1****$2");

  res.json({ success: true, message: "OTP sent", email: email });
}

async function handleVerifyOtp(req, res) {
  console.log("handleVerifyOtp called");
  const { masked_id, email, otp } = req.body;
  console.log("req.body =", req?.body);
  if (!otp) throw new ValidationError("otp is required");
  if (!email && !masked_id) throw new ValidationError("email or masked_id is required");

  // Find most recent OTP for email (or use masked_id meta)
  const query = { used: false };
  if (email) query.email = email;
  if (masked_id) query["meta.masked_id"] = masked_id;

  const otpRecord = await VerificationOTP.findOne(query).sort({ createdAt: -1 });
  if (!otpRecord) throw new NotFoundError("OTP not found or already used/expired");

  if (otpRecord.expiresAt < new Date()) {
    throw new ValidationError("OTP expired");
  }

  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  if (otpHash !== otpRecord.otp_hash) throw new ValidationError("Invalid OTP");

  otpRecord.used = true;
  await otpRecord.save();

  res.json({ success: true, message: "OTP verified" });
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
export const emailLookupHandler = asyncHandler(handleEmailLookup);
export const verifyOtpHandler = asyncHandler(handleVerifyOtp);
export const replaceRejectedDocumentHandler = asyncHandler(replaceRejectedDocument);
