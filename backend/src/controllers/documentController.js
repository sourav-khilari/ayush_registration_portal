// src/controllers/documentController.js
import path from "path";
import { fileURLToPath } from "url";
import Document from "../models/Document.js";
import DocumentRequirement from "../models/DocumentRequirement.js";
import Application from "../models/Application.js";
import { checkAllDocsAndSendFinalMail } from "../utils/checkAllDocsAndSendFinalMail.js";
import { sendDocumentFailureEmail } from "../utils/sendDocumentFailureEmail.js";

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
      req?.user?.email || req.user?.name || req.user?.username
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

        doc.verified_status = "failed";
        await doc.save();

        // ---------------------- FAILURE EMAIL (OCR failed) ---------------------- //
        try {
          await sendDocumentFailureEmail(doc);
        } catch (err) {
          console.error(
            "Failed to send failure email (OCR failed):",
            err.message
          );
        }

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
        // Identity
        aadhar: "aadhaar",
        aadhaar: "aadhaar",
        founder_id: "aadhaar",

        pan: "pan",
        founder_pan: "pan",

        // Company registration (GST only)
        gst: "gst",
        gst_certificate: "gst",
        company_registration: "gst",

        // Business formation
        constitution_document: "incorporation",
        business_formation_document: "incorporation",

        // Address
        address_proof: "utility-bill",
      };

      const normalizedDocType = (doc_category_declared || "")
        .toLowerCase()
        .trim();
      let verifyDocType = verificationTypeMap[normalizedDocType] || null;
      let extractedPayload = null;

      // Helper
      function hasAllKeys(obj, keys) {
        return keys.every(
          (k) =>
            obj &&
            obj[k] !== undefined &&
            obj[k] !== null &&
            String(obj[k]).trim() !== ""
        );
      }

      /* -------------------------------------------------
   BUILD PAYLOAD BASED ON verifyDocType
--------------------------------------------------*/

      switch (verifyDocType) {
        case "aadhaar":
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
            doc.verified_status = "rejected";
            await doc.save();
            await sendDocumentFailureEmail(doc);
            return res.status(201).json({
              success: true,
              message: "Aadhaar fields missing; verification skipped",
              document: doc,
            });
          }
          break;

        case "pan":
          extractedPayload = {
            pan: extractedData.pan_number || extractedData.pan,
            name: extractedData.name,
            dob: extractedData.dob,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };

          if (!hasAllKeys(extractedPayload, ["pan", "name"])) {
            doc.verified_status = "rejected";
            await doc.save();
            await sendDocumentFailureEmail(doc);
            return res.status(201).json({
              success: true,
              message: "PAN fields missing; verification skipped",
              document: doc,
            });
          }
          break;

        case "utility-bill":
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
            doc.verified_status = "rejected";
            await doc.save();
            await sendDocumentFailureEmail(doc);
            return res.status(201).json({
              success: true,
              message: "Utility bill fields missing; verification skipped",
              document: doc,
            });
          }
          break;

        case "gst":
          extractedPayload = {
            gstin: extractedData.gstin,
            legal_name:
              extractedData.legal_name ||
              extractedData.entity_name ||
              extractedData.canonical_name,
            registration_date:
              extractedData.registration_date ||
              extractedData.date_of_registration,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };

          if (
            !hasAllKeys(extractedPayload, [
              "gstin",
              "legal_name",
              "registration_date",
            ])
          ) {
            doc.verified_status = "rejected";
            await doc.save();
            await sendDocumentFailureEmail(doc);
            return res.status(201).json({
              success: true,
              message: "GST fields missing; verification skipped",
              document: doc,
            });
          }
          break;

        case "incorporation":
          extractedPayload = {
            reg_no:
              extractedData.cin || extractedData.llpin || extractedData.reg_no,
            entity_name:
              extractedData.entity_name ||
              extractedData.company_name ||
              extractedData.canonical_name,
            date_of_incorporation:
              extractedData.date_of_incorporation ||
              extractedData.incorporation_date,
            ocr_confidence: extractedData.ocr_confidence || 0.8,
          };

          if (
            !hasAllKeys(extractedPayload, [
              "reg_no",
              "entity_name",
              "date_of_incorporation",
            ])
          ) {
            doc.verified_status = "rejected";
            await doc.save();
            await sendDocumentFailureEmail(doc);
            return res.status(201).json({
              success: true,
              message: "Incorporation fields missing; verification skipped",
              document: doc,
            });
          }
          break;

        default:
          console.log(
            `ℹ️ Verification not supported for document type: ${doc_category_declared}`
          );
          doc.verified_status = "rejected";
          await doc.save();
          await sendDocumentFailureEmail(doc);
          return res.status(201).json({
            success: true,
            message:
              "Document uploaded. Verification not supported for this category.",
            document: doc,
          });
      }

      /* -------------------------------------------------
   CALL VERIFICATION API
--------------------------------------------------*/

      const verifyBase =
        process.env.DOC_VER_API_BASE ||
        "https://doc-ver-service.onrender.com/api/v1/verify";

      const verifyUrl = `${verifyBase}/${verifyDocType}`;

      console.log(`📡 Sending verification request to: ${verifyUrl}`);
      console.log("📦 Payload:", extractedPayload);

      try {
        const docTypeMap = {
          aadhaar: "AADHAAR",
          pan: "PAN",
          gst: "GST",
          incorporation: "INCORP",
          "utility-bill": "UTILITY",
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
            submitted_by: req.user?.email || "unknown",
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
          const errText = await verifyResp.text();
          doc.verified_status = "error";
          doc.verification_response = { error: errText };
        }
      } catch (err) {
        doc.verified_status = "error";
        doc.verification_response = { error: err.message };
      }

      await doc.save();

      // ---------------------- FAILURE EMAIL (AUTO VERIFICATION result) ---------------------- //
      if (
        doc.verified_status === "rejected" ||
        doc.verified_status === "pending"
      ) {
        try {
          await sendDocumentFailureEmail(doc);
        } catch (err) {
          console.error(
            "Failed to send failure email (auto verification result):",
            err.message
          );
        }
      }
    } catch (err) {
      console.error("OCR or Verification error:", err);
      doc.ocr_status = "failed";
      doc.verified_status = "failed";
      await doc.save();

      // send failure email for OCR/verification error
      try {
        await sendDocumentFailureEmail(doc);
      } catch (emailErr) {
        console.error(
          "Failed to send failure email (OCR/verification catch):",
          emailErr.message
        );
      }
    }
    console.log("doc=\n" + JSON.stringify(doc, null, 2));
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
  const role = req.user?.role;
  const isAdminOrGovOrInvestor =
    role === "admin" || role === "gov_official" || role === "investor";

  let filter;

  if (startup_id) {
    const startupId = startup_id;
    const appIds = await Application.find({ startup_id: startupId })
      .select("_id")
      .lean()
      .then((apps) => apps.map((a) => a._id));

    const docFilter = {
      $or: [
        { startup_id: startupId },
        ...(appIds.length ? [{ application_id: { $in: appIds } }] : []),
      ],
    };

    if (isAdminOrGovOrInvestor) {
      filter = docFilter;
    } else {
      filter = { uploaded_by: req.user._id, ...docFilter };
    }
  } else {
    filter = { uploaded_by: req.user._id };
    if (application_id) filter.application_id = application_id;
  }

  const docs = await Document.find(filter)
    .sort({ createdAt: -1 })
    .select(
      "document_name filename fileUrl file_size doc_category_declared verified_status ocr_status extracted_fields createdAt"
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

// ---------------------- Manual Verification handler ---------------------- //
async function setDocumentVerificationImpl(req, res) {
  try {
    const { docId } = req.params;
    const { verified_status, comment } = req.body;

    if (!docId) return res.status(400).json({ message: "docId required" });

    const update = { verified_status };
    if (comment) update["meta.verificationComment"] = comment;
    if (verified_status === "verified") {
      update.verified_at = new Date();
      update.verified_by = req.user?._id || req.user?.id || null;
    }

    const doc = await Document.findByIdAndUpdate(docId, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const appId =
      doc.application_id || doc.applicationId || doc.meta?.applicationId;
    if (appId) {
      await Application.findByIdAndUpdate(appId, {
        $addToSet: { documents: doc._id },
      });
    }

    // If admin rejected -> send failure email
    if (doc.verified_status === "rejected") {
      try {
        await sendDocumentFailureEmail(doc);
      } catch (err) {
        console.error(
          "Failed to send failure email (manual rejection):",
          err.message
        );
      }
    }

    // Trigger final-mail check AFTER persisting verification
    if (doc.verified_status === "verified") {
      try {
        await checkAllDocsAndSendFinalMail(doc._id);
      } catch (err) {
        console.error("Failed to check/send final verification email:", err);
      }
    }

    return res.json({
      success: true,
      message: "Document verification updated",
      data: doc,
    });
  } catch (err) {
    console.error("setDocumentVerificationImpl error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ---------------------- Replace Rejected Document ---------------------- //
async function replaceRejectedDocument(req, res) {
  const file = req.file;
  if (!file) throw new ValidationError("File is required");

  const docId = req.params.id;
  const doc = await Document.findById(docId);
  if (!doc) throw new NotFoundError("Document not found");

  if (String(doc.uploaded_by) !== String(req.user._id)) {
    throw new AppError("Not authorized to replace this document", 403);
  }

  if (doc.verified_status !== "rejected") {
    throw new ValidationError(
      "Document can only be replaced if it is rejected"
    );
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.mimetype))
    throw new ValidationError("Only PDF, JPEG, and PNG files are allowed");

  try {
    if (!doc.versions) doc.versions = [];
    doc.versions.push({
      fileUrl: doc.fileUrl,
      fileName: doc.filename,
      fileSize: doc.file_size,
      uploaded_at: doc.updatedAt || doc.createdAt,
      uploaded_by: doc.uploaded_by,
    });

    const { fileUrl, username } = await uploadToLocal(
      file.path,
      file.originalname,
      req?.user?.email || req.user?.name || req.user?.username
    );

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

    doc.fileUrl = fileUrl;
    doc.filename = file.originalname;
    doc.document_name = req.body.document_name || file.originalname;
    doc.file_size = file.size;
    doc.page_images = pageImages;
    doc.page_count = pageImages.length;
    doc.ocr_status = "pending";
    doc.verified_status = "pending";
    doc.rejection_reason = undefined;
    doc.verified_by = undefined;
    doc.verified_at = undefined;

    await doc.save();

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
      for (const [key, value] of Object.entries(extractedData || {})) {
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
      message:
        "Document replaced successfully. Verification will be processed.",
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

  const last4 = String(masked_id).slice(-4);
  const windowMinutes = parseInt(
    process.env.EMAIL_LOOKUP_WINDOW_MINUTES || "10",
    10
  );
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const doc = await Document.findOne({
    ocr_status: "done",
    verified_status: "verified",
    createdAt: { $gte: since },
    $or: [{ "ocr_text.aadhaar_last4": last4 }],
  }).lean();

  if (!doc)
    throw new NotFoundError(
      "No recently verified document found for provided id"
    );

  const lookupBase =
    process.env.DOC_VER_API_BASE || "http://localhost:8000/api/v1/verify";
  const lookupUrl = `${lookupBase}/email-lookup`;

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

  try {
    await sendEmail({
      email,
      subject: "Your OTP code",
      message: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    });
  } catch (err) {
    console.warn("Failed to send OTP email:", err.message);
  }

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1****$2");

  res.json({ success: true, message: "OTP sent", email: email });
}

async function handleVerifyOtp(req, res) {
  console.log("handleVerifyOtp called");
  const { masked_id, email, otp } = req.body;
  console.log("req.body =", req?.body);
  if (!otp) throw new ValidationError("otp is required");
  if (!email && !masked_id)
    throw new ValidationError("email or masked_id is required");

  const query = { used: false };
  if (email) query.email = email;
  if (masked_id) query["meta.masked_id"] = masked_id;

  const otpRecord = await VerificationOTP.findOne(query).sort({
    createdAt: -1,
  });
  if (!otpRecord)
    throw new NotFoundError("OTP not found or already used/expired");

  if (otpRecord.expiresAt < new Date()) {
    throw new ValidationError("OTP expired");
  }

  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  if (otpHash !== otpRecord.otp_hash) throw new ValidationError("Invalid OTP");

  otpRecord.used = true;
  await otpRecord.save();

  res.json({ success: true, message: "OTP verified" });
}

// ---------------------- Oaky: notify-registration ---------------------- //
async function handleOaky(req, res) {
  console.log("handleOaky called");
  console.log("req.body =", req?.body);
  const { aadhaar_last4, documents } = req.body || {};
  if (!aadhaar_last4)
    throw new ValidationError("aadhaar_last4 is required in request body");

  // documents is optional but should be an array if provided
  const docs = Array.isArray(documents) ? documents : [];

  const lookupUrl =
    (process.env.DOC_VER_API_BASE || "http://localhost:8000/api/v1/verify") +
    "/email-lookup";

  let email = null;
  try {
    const resp = await fetch(lookupUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aadhar_last4: aadhaar_last4 }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.warn("Email lookup failed for oaky:", resp.status, txt);
      throw new AppError("Email lookup service failed", 502);
    }

    const data = await resp.json();
    email = data?.data?.email || data?.email;
    if (!email) {
      console.warn("Email lookup returned no email:", data);
      throw new AppError("Email not found from lookup service", 404);
    }
  } catch (err) {
    console.error("oaky: lookup error", err?.message || err);
    throw err;
  }

  // Compose HTML email summarizing document statuses
  const htmlRows = (docs || [])
    .map((d) => {
      const cat =
        d.category || d.doc_category || d.doc_category_declared || "unknown";
      const status =
        d.verified_status ||
        d.status ||
        (d.raw && (d.raw.verified_status || d.raw.status)) ||
        "unknown";
      const reason =
        d.reason ||
        d.rejection_reason ||
        (d.raw && d.raw.rejection_reason) ||
        "";
      return `<tr><td style="padding:8px;border:1px solid #ddd">${cat}</td><td style="padding:8px;border:1px solid #ddd">${status}</td><td style="padding:8px;border:1px solid #ddd">${reason || "-"}</td></tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.4;color:#111">
      <h2>Registration document verification summary</h2>
      <p>We received verification results for your registration. Aadhaar last4: <strong>****${aadhaar_last4}</strong></p>
      <table style="border-collapse:collapse;border:1px solid #ddd;width:100%">
        <thead><tr><th style="padding:8px;border:1px solid #ddd;text-align:left">Document</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Status</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Notes</th></tr></thead>
        <tbody>
          ${htmlRows || '<tr><td style="padding:8px;border:1px solid #ddd" colspan="3">No document details provided.</td></tr>'}
        </tbody>
      </table>
      <p style="margin-top:12px">If you have questions, reply to this email or contact support.</p>
    </div>
  `;

  const plain =
    `Registration summary for Aadhaar ****${aadhaar_last4}\n\n` +
    (docs.length
      ? docs
          .map(
            (d) =>
              `${d.category || d.doc_category || "doc"}: ${d.verified_status || d.status || "unknown"}`
          )
          .join("\n")
      : "No document details provided.");

  try {
    await sendEmail({
      email,
      subject: "Registration documents summary",
      message: plain,
      html,
    });
    const maskedEmail = String(email).replace(/(.{2}).+(@.+)/, "$1****$2");
    console.log(`oaky: sent summary to ${email}`);
    return res.json({
      success: true,
      message: "Notification sent",
      email: maskedEmail,
    });
  } catch (err) {
    console.error("oaky: failed to send email", err?.message || err);
    throw new AppError("Failed to send notification email", 500);
  }
}

// ---------------------- Exports ---------------------- //
export const uploadDocumentHandler = asyncHandler(handleUploadDocument);
export const getDocumentHandler = asyncHandler(getDocument);
export const listDocumentsHandler = asyncHandler(listDocuments);
export const reassignDocumentHandler = asyncHandler(reassignDocument);
export const getRequirementsHandler = asyncHandler(getRequirements);

// keep the external export name unchanged — but point it to the renamed impl
export const setDocumentVerificationHandler = asyncHandler(
  setDocumentVerificationImpl
);

export const emailLookupHandler = asyncHandler(handleEmailLookup);
export const verifyOtpHandler = asyncHandler(handleVerifyOtp);
export const replaceRejectedDocumentHandler = asyncHandler(
  replaceRejectedDocument
);
export const oakyHandler = asyncHandler(handleOaky);
