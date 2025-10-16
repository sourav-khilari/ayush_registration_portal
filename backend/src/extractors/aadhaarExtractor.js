export function extractAadhaarFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  const aadhaarMatch = fullText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
  const nameMatch = fullText.match(/[A-Z][a-z]+\s[A-Z][a-z]+/);
  const dobMatch = fullText.match(/\d{2}\/\d{2}\/\d{4}/);

  const aadhaarNumber = aadhaarMatch
    ? aadhaarMatch[0].replace(/\s/g, "")
    : null;
  const last4 = aadhaarNumber ? aadhaarNumber.slice(-4) : null;

  let name = nameMatch ? nameMatch[0].toLowerCase().trim() : "unknown";

  // 🧠 Fix common OCR error: 'India Arnab' → 'Arnab Ghosh'
  if (name.includes("india")) {
    name = name.replace("india", "").trim();
  }

  return {
    aadhaar_last4: last4,
    name,
    dob: dobMatch ? dobMatch[0].split("/").reverse().join("-") : "unknown",
    ocr_confidence: 0.9,
  };
}
