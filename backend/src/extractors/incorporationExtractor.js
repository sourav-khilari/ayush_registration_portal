export function extractIncorporationFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // LLPIN / CIN
  const regMatch =
    fullText.match(/LLP Identification Number[:\s]*([A-Z0-9]+)/i) ||
    fullText.match(/\bCIN[:\s]*([A-Z0-9]+)/i);

  // Company / LLP Name (avoid LLPIN line)
  const entityLine = ocrTextArray.find(
    (line) =>
      line.toUpperCase().includes(" LLP") &&
      !line.toUpperCase().includes("IDENTIFICATION") &&
      !line.toUpperCase().includes("NUMBER")
  );

  // Date normalization → YYYY-MM-DD
  const dateMatch =
    fullText.match(/\b(\d{2})-(\d{2})-(\d{4})\b/) ||
    fullText.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);

  const isoDate = dateMatch
    ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    : null;

  return {
    reg_no: regMatch ? regMatch[1] : null,
    entity_name: entityLine ? entityLine.trim() : null,
    date_of_incorporation: isoDate,
    ocr_confidence: 0.9,
  };
}
