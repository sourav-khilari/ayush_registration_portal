import { extractPANData } from "./panExtractor.js";
import { extractFounderIdFields } from "./founderIdExtractor.js";
import { extractAddressProofFields } from "./addressProofExtractor.js";
import { extractBusinessPitchFields } from "./businessPitchExtractor.js";
import { extractCompanyRegistrationFields } from "./companyRegistrationExtractor.js";
import { extractGSTFields } from "./gstExtractor.js"; // <-- ADD THIS

export function getExtractor(docType) {
  const t = docType?.toLowerCase().trim();

  switch (t) {
    case "aadhaar":
    case "aadhar":
    case "founder_id":
      return extractFounderIdFields;

    case "pan":
    case "founder_pan":
      return extractPANData;

    case "address_proof":
      return extractAddressProofFields;

    case "business_pitch":
      return extractBusinessPitchFields;

    case "gst":
    case "gst_certificate":
      return extractGSTFields; // <-- USE THE NEW GST EXTRACTOR

    case "company_registration":
      return extractCompanyRegistrationFields;

    default:
      return null;
  }
}
