// src/utils/checkAllDocsAndSendFinalMail.js
import Document from "../models/Document.js";
import Application from "../models/Application.js";
import { sendEmail } from "./sendEmail.js";

/**
 * Given a document id that was just verified, check the parent Application's
 * required documents (using checkRequiredDocuments) and send the final email once.
 */
export async function checkAllDocsAndSendFinalMail(docId) {
  const doc = await Document.findById(docId).lean();
  if (!doc) return;

  const applicationId =
    doc.application_id ||
    doc.applicationId ||
    doc.app_id ||
    doc.meta?.applicationId;
  if (!applicationId) {
    // If doc not linked to an application, try to use meta email fallback
    const fallbackEmail = doc.meta?.applicantEmail || doc.meta?.email;
    if (!fallbackEmail) return;
    // If only single doc exists for this flow, we can send fallback email (rare)
    const already = doc.meta?.finalMailSent;
    if (already) return;
    // Atomically mark doc.meta.finalMailSent
    const marker = await Document.findOneAndUpdate(
      { _id: doc._id, "meta.finalMailSent": { $ne: true } },
      { $set: { "meta.finalMailSent": true } }
    );
    if (!marker) return;
    await sendEmail({
      email: fallbackEmail,
      subject: `Documents verified — ${doc._id}`,
      message: `Hi,\n\nYour document has been verified.\n\nRegards,\nAyush Portal`,
    });
    return;
  }

  // Load application
  const app = await Application.findById(applicationId);
  if (!app) return;

  // Use your instance method to check required docs. require_verified = true
  const result = await app.checkRequiredDocuments({ require_verified: true });
  if (!result.complete) return;

  // Atomically mark verificationEmailSent true and status -> approved/verified (only if not already set)
  const updatedApp = await Application.findOneAndUpdate(
    { _id: applicationId, verificationEmailSent: { $ne: true } },
    { $set: { verificationEmailSent: true, status: "under_review" } }, // keep status change minimal; change as per your flow
    { new: true }
  );

  if (!updatedApp) {
    // someone else already sent it
    return;
  }

  // pick recipient from application.meta or startup owner via startup_id (best effort)
  let to =
    updatedApp.meta?.applicantEmail || updatedApp.meta?.ownerEmail || null;
  let name = updatedApp.meta?.applicantName || "Applicant";

  // best-effort: if no email in meta, try to populate via populated startup or documents
  if (!to) {
    // search one of the application's documents for meta email
    const docs = await Document.find({ application_id: applicationId })
      .limit(1)
      .lean();
    if (docs && docs[0]) {
      to = docs[0].meta?.applicantEmail || docs[0].meta?.email;
      name = docs[0].meta?.applicantName || name;
    }
  }

  if (!to) {
    // fail silently; nothing to send to
    return;
  }

  const subject = `All documents successfully verified — Application ${applicationId}`;
  const message = `Hi ${name},\n\nAll required documents for your application ${applicationId} have been successfully verified.\n\nRegards,\nAyush Portal Team`;

  try {
    await sendEmail({ email: to, subject, message });
    // success logged by sendEmail or here
  } catch (err) {
    console.error("checkAllDocsAndSendFinalMail: sendEmail failed:", err);
    // leave verificationEmailSent = true to avoid retries sending duplicates;
    // if you prefer retry logic, implement job/retry separately
  }
}
