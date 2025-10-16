export function extractPANData(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // Extract PAN number (10-character alphanumeric)
  const panMatch = fullText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
  const panNumber = panMatch ? panMatch[0] : null;

  // Extract Name (avoid lines like "Permanent Account" or "Income Tax Department")
  const nameLine = ocrTextArray.find(
    (line) =>
      /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(line.trim()) &&
      !line.toLowerCase().includes("department") &&
      !line.toLowerCase().includes("permanent") &&
      !line.toLowerCase().includes("income") &&
      !line.toLowerCase().includes("government")
  );

  const cleanName = nameLine ? nameLine.trim() : "Unknown";
  const canonicalName = cleanName.toLowerCase();

  // Extract DOB — usually in DD/MM/YYYY format
  const dobMatch = fullText.match(/\d{2}\/\d{2}\/\d{4}/);

  return {
    pan_number: panNumber,
    name: cleanName,
    canonical_name: canonicalName,
    dob: dobMatch ? dobMatch[0].split("/").reverse().join("-") : "Unknown",
    ocr_confidence: 0.9,
  };
}
