import { extractPANData } from "./panExtractor.js";
import { extractFounderIdFields } from "./founderIdExtractor.js";
import { extractAddressProofFields } from "./addressProofExtractor.js";
import { extractBusinessPitchFields } from "./businessPitchExtractor.js";
import { extractCompanyRegistrationFields } from "./companyRegistrationExtractor.js";
import { extractGSTFields } from "./gstExtractor.js";
import { extractMOAFields } from "./moaExtractor.js"; // <-- ADDED
import { extractIncorporationFields } from "./incorporationExtractor.js"; // ✅ NEW

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
      return extractGSTFields;

    case "company_registration":
      return extractCompanyRegistrationFields;

    // ✅ MOA
    case "moa":
    case "moa_certificate":
    case "memorandum_of_association":
      return extractMOAFields;

    // ✅ INCORPORATION / CONSTITUTION
    case "constitution_document":
    case "business_formation_document":
    case "incorporation":
      return extractIncorporationFields;

    default:
      return null;
  }
}
