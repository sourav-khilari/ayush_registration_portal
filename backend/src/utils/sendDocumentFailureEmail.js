import { sendEmail } from "./sendEmail.js";
import Application from "../models/Application.js";
import Document from "../models/Document.js";

export async function sendDocumentFailureEmail(doc) {
  try {
    // 1) Get application
    const appId =
      doc.application_id || doc.applicationId || doc.meta?.applicationId;
    let email = null;
    let name = "Applicant";

    if (appId) {
      const app = await Application.findById(appId).lean();
      if (app?.meta?.applicantEmail) email = app.meta.applicantEmail;
      if (app?.meta?.applicantName) name = app.meta.applicantName;
    }

    // 2) If doc itself has email fallback
    if (!email) {
      email = doc.meta?.applicantEmail || doc.meta?.email;
    }

    if (!email) {
      console.warn("⚠️ No email found for failed verification notification.");
      return;
    }

    // 3) Prepare message
    const subject = `Document Verification Failed — ${doc.doc_category_declared}`;
    const reason =
      doc.rejection_reason ||
      doc.verification_response?.error ||
      "Verification could not be completed. Please review and upload again.";

    const message = `
Hi ${name},

Your document *${doc.doc_category_declared}* could not be verified.

Reason:
${reason}

Please re-upload a corrected or clearer document and try again.

Regards,
Ayush Startup Portal Team
`;

    // 4) Send email
    await sendEmail({ email, subject, message });

    console.log(`📩 Failure email sent to ${email} for doc ${doc._id}`);
  } catch (err) {
    console.error("sendDocumentFailureEmail error:", err.message);
  }
}
