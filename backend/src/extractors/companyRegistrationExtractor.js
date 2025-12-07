export function extractCompanyRegistrationFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // 1) Extract GSTIN (robust-ish pattern: starts with 2 digits and 13 more alnum chars)
  const gstMatch = fullText.match(/\b[0-9]{2}[A-Z0-9]{13}\b/i);
  const gstin = gstMatch ? gstMatch[0].toUpperCase() : null;

  // 2) Extract legal/trade name
  // Prefer the line after a "Trade / Legal Name" label; fallback to an uppercase-ish line.
  let legalName = null;
  for (let i = 0; i < ocrTextArray.length; i++) {
    const line = (ocrTextArray[i] || "").trim();
    const lower = line.toLowerCase();
    if (
      lower.includes("trade / legal name") ||
      lower.includes("trade name") ||
      lower.includes("legal name")
    ) {
      legalName = (ocrTextArray[i + 1] || "").trim() || null;
      break;
    }
  }

  if (!legalName) {
    const alt = ocrTextArray.find((l) => {
      if (!l) return false;
      const t = l.trim();
      if (t.length < 3) return false;
      if (/certificate|registration|ministry|government/i.test(t)) return false;
      // likely company name lines are uppercase and contain letters/spaces/&.
      return /^[A-Z0-9][A-Z0-9\s&.,'()-]{2,}$/.test(t);
    });
    legalName = alt ? alt.trim() : null;
  }

  // 3) Extract registration date: prefer YYYY-MM-DD, fallback DD/MM/YYYY or DD-MM-YYYY
  let registrationDate = null;
  const isoMatch = fullText.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) {
    registrationDate = isoMatch[0];
  } else {
    const dmy = fullText.match(/\b([0-3]?\d)[\/-]([0-1]?\d)[\/-](\d{4})\b/);
    if (dmy) {
      const dd = dmy[1].padStart(2, "0");
      const mm = dmy[2].padStart(2, "0");
      const yyyy = dmy[3];
      registrationDate = `${yyyy}-${mm}-${dd}`;
    }
  }

  // 4) Confidence (simple fixed heuristic like your PAN extractor)
  const ocr_confidence = 0.9;

  return {
    gstin: gstin || null,
    legal_name: legalName || null,
    registration_date: registrationDate || null,
    ocr_confidence,
  };
}
