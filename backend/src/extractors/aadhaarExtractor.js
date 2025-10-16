export function extractAadhaarFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // Aadhaar number: 12 digits
  const aadhaarMatch = fullText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
  const aadhaarNumber = aadhaarMatch
    ? aadhaarMatch[0].replace(/\s/g, "")
    : null;
  const last4 = aadhaarNumber ? aadhaarNumber.slice(-4) : null;

  // Try to find a line that looks like a person's name (not "India")
  const nameLine = ocrTextArray.find(
    (line) =>
      /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(line.trim()) &&
      !line.includes("India") &&
      !line.toLowerCase().includes("government")
  );

  const cleanName = nameLine ? nameLine.trim() : "Unknown";
  const canonicalName = cleanName.toLowerCase();

  // Extract date of birth
  const dobMatch = fullText.match(/\d{2}\/\d{2}\/\d{4}/);

  return {
    aadhaar_last4: last4,
    name: cleanName,
    canonical_name: canonicalName,
    dob: dobMatch ? dobMatch[0].split("/").reverse().join("-") : "Unknown",
    ocr_confidence: 0.9,
  };
}
