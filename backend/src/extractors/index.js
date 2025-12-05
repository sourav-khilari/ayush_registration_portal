// src/extractors/index.js
import { extractPANData } from "./panExtractor.js";
import { extractFounderIdFields } from "./founderIdExtractor.js";
import { extractAddressProofFields } from "./addressProofExtractor.js";
import { extractBusinessPitchFields } from "./businessPitchExtractor.js";
import { extractCompanyRegistrationFields } from "./companyRegistrationExtractor.js";

export function getExtractor(docType) {
  // Normalize docType to handle various formats
  const normalizedType = docType?.toLowerCase()?.trim();

  switch (normalizedType) {
    case "aadhar":
    case "aadhaar":
    case "founder_id":
    case "id_proof":
      // Aadhaar acts as founder_id - use the same extractor
      return extractFounderIdFields;
    case "pan":
    case "founder_pan":
      return extractPANData;
    case "address_proof":
      return extractAddressProofFields;
    case "business_pitch":
    case "business_plan":
    case "proposal":
      return extractBusinessPitchFields;
    case "company_registration":
    case "registration_certificate":
      return extractCompanyRegistrationFields;
    default:
      return null;
  }
}
