// src/extractors/index.js
import { extractAadhaarFields } from "./aadhaarExtractor.js";
import { extractPANData } from "./panExtractor.js"; // ✅ must import PAN extractor

export function getExtractor(docType) {
  switch (docType?.toUpperCase()) {
    case "AADHAR":
      return extractAadhaarFields;
    case "PAN":
      return extractPANData;
    default:
      return null;
  }
}
