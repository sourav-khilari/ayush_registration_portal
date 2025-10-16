// src/extractors/index.js
import { extractAadhaarFields } from "./aadhaarExtractor.js";
import { extractPANData } from "./panExtractor.js"; // ✅ must import PAN extractor

export function getExtractor(docType) {
  switch (docType?.toUpperCase()) {
    case "FOUNDER_ID":
      return extractAadhaarFields;
    case "FOUNDER_PAN":
      return extractPANData;
    default:
      return null;
  }
}
