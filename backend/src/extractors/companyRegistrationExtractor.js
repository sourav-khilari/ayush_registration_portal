/**
 * Extractor for Company Registration Certificate documents
 */
export function extractCompanyRegistrationFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // Extract CIN (Corporate Identity Number) - 21 characters
  // Format: U12345WB2010PTC012345 or L12345WB2010PTC012345
  let cin = null;
  const cinPatterns = [
    /\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/, // Standard CIN format
    /\bCIN[:\s]*([UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b/i, // CIN: prefix
    /\bCorporate\s+Identity\s+Number[:\s]*([UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b/i,
  ];
  
  for (const pattern of cinPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      cin = match[1] || match[0];
      break;
    }
  }
  
  // Also look for other registration number formats (LLP, Partnership, etc.)
  if (!cin) {
    const regPatterns = [
      /\bRegistration\s+No[.:\s]*([A-Z0-9]{10,21})\b/i,
      /\bReg[.\s]*No[.:\s]*([A-Z0-9]{10,21})\b/i,
      /\bCertificate\s+of\s+Incorporation[:\s]*([A-Z0-9]{10,21})\b/i,
    ];
    
    for (const pattern of regPatterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        cin = match[1];
        break;
      }
    }
  }

  // Extract Company Name (usually prominent in registration certificate)
  const companyNameLine = ocrTextArray.find(
    (line, index) =>
      index < 10 && // Usually in first 10 lines
      /^[A-Z][A-Za-z\s&.,]+$/.test(line.trim()) &&
      line.trim().length > 5 &&
      !line.toLowerCase().includes("certificate") &&
      !line.toLowerCase().includes("registration") &&
      !line.toLowerCase().includes("ministry") &&
      !line.toLowerCase().includes("government")
  );
  const companyName = companyNameLine ? companyNameLine.trim() : "Unknown";

  // Extract Registration Date
  const datePatterns = [
    /\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
    /\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
    /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
  ];
  let registrationDate = "Unknown";
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const dateStr = match[0];
      if (dateStr.includes("/")) {
        registrationDate = dateStr.split("/").reverse().join("-");
      } else if (dateStr.includes("-")) {
        registrationDate = dateStr;
      }
      break;
    }
  }

  // Extract Registered Address
  const addressKeywords = ["address", "registered office", "corporate office", "head office"];
  const addressLines = ocrTextArray.filter((line) => {
    const lowerLine = line.toLowerCase();
    return addressKeywords.some((keyword) => lowerLine.includes(keyword)) ||
           /\d{6}/.test(line); // PIN code pattern
  });
  const registeredAddress = addressLines.length > 0 ? addressLines.join(", ") : "Unknown";

  // Extract PIN code
  const pinMatch = fullText.match(/\b\d{6}\b/);
  const pinCode = pinMatch ? pinMatch[0] : null;

  // Extract Company Type (Private Limited, Public Limited, etc.)
  let companyType = "Unknown";
  if (fullText.toLowerCase().includes("private limited")) {
    companyType = "Private Limited";
  } else if (fullText.toLowerCase().includes("public limited")) {
    companyType = "Public Limited";
  } else if (fullText.toLowerCase().includes("llp")) {
    companyType = "LLP";
  } else if (fullText.toLowerCase().includes("partnership")) {
    companyType = "Partnership";
  } else if (fullText.toLowerCase().includes("sole proprietorship")) {
    companyType = "Sole Proprietorship";
  }

  // Extract Authorized Capital if mentioned
  const capitalMatch = fullText.match(/authorized\s+capital[:\s]+[₹]?\s*(\d+[,\d]*)/i);
  const authorizedCapital = capitalMatch ? capitalMatch[1] : null;

  // Format to match INCORP verification API
  return {
    reg_no: cin || null, // CIN or registration number
    entity_name: companyName,
    date_of_incorporation: registrationDate !== "Unknown" ? registrationDate : null,
    ocr_confidence: 0.85,
    // Additional fields for internal use
    registered_address: registeredAddress,
    pin_code: pinCode,
    company_type: companyType,
    authorized_capital: authorizedCapital,
  };
}

