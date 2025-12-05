/**
 * Extractor for Founder ID Proof documents (Aadhaar acts as founder_id)
 * This extractor handles Aadhaar documents directly
 */
export function extractFounderIdFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // Extract Aadhaar number (12 digits)
  const aadhaarMatch = fullText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
  const aadhaarNumber = aadhaarMatch
    ? aadhaarMatch[0].replace(/\s/g, "")
    : null;
  const aadhaar_last4 = aadhaarNumber && aadhaarNumber.length === 12 
    ? aadhaarNumber.slice(-4) 
    : null;

  // Extract Name - look for lines that look like person names
  const nameLine = ocrTextArray.find(
    (line) =>
      /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(line.trim()) &&
      !line.includes("India") &&
      !line.toLowerCase().includes("government")
  );

  const name = nameLine ? nameLine.trim() : "Unknown";
  const canonical_name = name.toLowerCase();

  // Extract Date of Birth
  const dobMatch = fullText.match(/\d{2}\/\d{2}\/\d{4}/);
  let dob = "Unknown";
  if (dobMatch) {
    dob = dobMatch[0].split("/").reverse().join("-");
  }

  return {
    aadhaar_last4: aadhaar_last4,
    name: name !== "Unknown" ? name : null,
    dob: dob !== "Unknown" ? dob : null,
    document_number: aadhaarNumber,
    canonical_name: canonical_name,
    ocr_confidence: 0.9,
  };
}
