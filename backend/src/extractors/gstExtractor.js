/**
 * Extractor for GST Certificate
 * Returns ONLY the fields required by `/verify/gst` API
 */
export function extractGSTFields(ocrTextArray) {
  const fullText = Array.isArray(ocrTextArray)
    ? ocrTextArray.join(" ").replace(/\s+/g, " ")
    : "";

  // ----------- GSTIN -----------
  let gstin = null;

  const gstinLabelMatch = fullText.match(/GSTIN[:\s]*([0-9A-Z]{15})/i);
  if (gstinLabelMatch) {
    gstin = gstinLabelMatch[1];
  } else {
    const any15 = fullText.match(/\b[0-9A-Z]{15}\b/);
    gstin = any15 ? any15[0] : null;
  }

  // ----------- Legal Name -----------
  let legalName = null;
  for (const line of ocrTextArray) {
    if (
      line.toUpperCase().includes("TRADE") ||
      line.toUpperCase().includes("LEGAL")
    ) {
      const nextLine = ocrTextArray[ocrTextArray.indexOf(line) + 1];
      if (nextLine) legalName = nextLine.trim().toUpperCase();
    }

    if (
      /^[A-Z][A-Z\s&.,()-]+$/.test(line.trim()) &&
      line.trim().length > 5 &&
      !line.toUpperCase().includes("CERTIFICATE") &&
      !line.toUpperCase().includes("GOVERNMENT") &&
      !line.toUpperCase().includes("GSTIN")
    ) {
      legalName = line.trim().toUpperCase();
      break;
    }
  }

  // ----------- Registration Date -----------
  let registrationDate = null;
  const dateMatch = fullText.match(/\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD from your certificate
  if (dateMatch) registrationDate = dateMatch[0];

  return {
    gstin: gstin || "",
    legal_name: legalName || "",
    registration_date: registrationDate || "",
    ocr_confidence: 0.9,
  };
}
