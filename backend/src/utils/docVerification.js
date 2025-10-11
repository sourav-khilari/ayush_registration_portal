import fetch from "node-fetch";

/**
 * Verify document using external verification API.
 * @param {string} docType - PAN, AADHAAR, GST, etc.
 * @param {object} extracted - Extracted fields from OCR.
 * @param {string} requestId - A unique request ID for logging.
 * @param {string} submittedBy - Usually the user's email or "frontend-1".
 * @returns {object} - Verification API JSON response.
 */
export async function verifyDocumentViaAPI(
  docType,
  extracted,
  requestId,
  submittedBy = "frontend-1"
) {
  const base =
    process.env.DOC_VER_API_BASE ||
    "https://doc-ver-service.onrender.com/api/v1/verify";

  const url = `${base}/${docType.toLowerCase()}`;
  const body = {
    request_id: requestId,
    submitted_by: submittedBy,
    doc_type: docType.toUpperCase(),
    extracted,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Verification API failed: ${resp.status} ${text}`);
  }

  return resp.json();
}
