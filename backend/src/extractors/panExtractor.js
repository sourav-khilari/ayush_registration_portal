export function extractPANData(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // PAN number pattern: 5 letters, 4 digits, 1 letter
  const panMatch = fullText.match(/[A-Z]{5}\d{4}[A-Z]{1}/);
  const nameMatch = fullText.match(/[A-Z][a-z]+\s[A-Z][a-z]+/);
  const dobMatch = fullText.match(/\d{2}\/\d{2}\/\d{4}/);

  const id_masked = panMatch ? panMatch[0].toUpperCase() : null;
  const canonical_name = nameMatch ? nameMatch[0].toLowerCase() : "unknown";
  const dob = dobMatch ? dobMatch[0].split("/").reverse().join("-") : "unknown";

  return {
    id_masked, // ✅ matches DB key
    canonical_name, // ✅ lowercase
    dob, // ✅ ISO-like date
    ocr_confidence: 0.9, // optional extra
  };
}
