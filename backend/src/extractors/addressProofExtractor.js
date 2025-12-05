/**
 * Extractor for Address Proof documents (Utility bills, Bank statements, etc.)
 */
export function extractAddressProofFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // Extract address - look for address lines (usually contains street, city, pin)
  const addressKeywords = ["apartment", "road", "street", "lane", "colony", "society", "village", "city", "state", "pin", "p.o.", "post"];
  const addressLines = [];
  
  // Look for lines that contain address-like patterns
  for (let i = 0; i < ocrTextArray.length; i++) {
    const line = ocrTextArray[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Skip if it's a header, company name, or number-only line
    if (line.length < 10 || 
        lowerLine.includes("company") || 
        lowerLine.includes("ltd") ||
        lowerLine.includes("government") ||
        /^\d+$/.test(line)) {
      continue;
    }
    
    // Check if line looks like an address
    const hasAddressKeyword = addressKeywords.some((keyword) => lowerLine.includes(keyword));
    const hasPinCode = /\d{6}/.test(line);
    const hasStreetPattern = /[A-Z][a-z]+\s+(road|street|lane|colony|apartment|society)/i.test(line);
    
    if (hasAddressKeyword || hasPinCode || hasStreetPattern) {
      addressLines.push(line);
      // Usually address is 2-4 consecutive lines
      if (addressLines.length >= 3) break;
    }
  }
  
  const address = addressLines.length > 0 ? addressLines.join(", ") : "Unknown";

  // Extract PIN code (6 digits)
  const pinMatch = fullText.match(/\b\d{6}\b/);
  const pinCode = pinMatch ? pinMatch[0] : null;

  // Extract consumer name - look for name patterns, avoid company names
  // Usually appears early in the document, before address
  let name = "Unknown";
  for (let i = 0; i < Math.min(15, ocrTextArray.length); i++) {
    const trimmed = ocrTextArray[i].trim();
    
    // Skip if it's clearly not a name
    if (trimmed.length < 3 || 
        trimmed.length > 50 ||
        trimmed.toLowerCase().includes("bank") ||
        trimmed.toLowerCase().includes("statement") ||
        trimmed.toLowerCase().includes("utility") ||
        trimmed.toLowerCase().includes("bill") ||
        trimmed.toLowerCase().includes("company") ||
        trimmed.toLowerCase().includes("ltd") ||
        trimmed.toLowerCase().includes("limited") ||
        trimmed.toLowerCase().includes("enterprise") ||
        trimmed.toLowerCase().includes("government") ||
        trimmed.toLowerCase().includes("distribution") ||
        /^\d+$/.test(trimmed) ||
        trimmed.includes(":") && !trimmed.match(/^[A-Z][a-z]+ [A-Z][a-z]+:/)) {
      continue;
    }
    
    // Look for person names (typically 2-3 words, each starting with capital)
    // Pattern: FirstName LastName or FirstName MiddleName LastName
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,2}$/.test(trimmed)) {
      name = trimmed;
      break;
    }
  }

  // Extract consumer account number - look for "ConsumerId" or "Consumer ID" pattern
  let accountNumber = null;
  const consumerIdPattern = /consumer\s*id[:\s]*(\d{6,12})/i;
  const consumerIdMatch = fullText.match(consumerIdPattern);
  if (consumerIdMatch && consumerIdMatch[1]) {
    accountNumber = consumerIdMatch[1];
  } else {
    // Fallback: look for account numbers near "Consumer" keyword
    const accountMatch = fullText.match(/\b\d{9,12}\b/);
    accountNumber = accountMatch ? accountMatch[0] : null;
  }

  // Extract document type (utility bill, bank statement, etc.)
  let documentType = "Unknown";
  if (fullText.toLowerCase().includes("bank") || fullText.toLowerCase().includes("statement")) {
    documentType = "Bank Statement";
  } else if (fullText.toLowerCase().includes("electricity") || fullText.toLowerCase().includes("power")) {
    documentType = "Electricity Bill";
  } else if (fullText.toLowerCase().includes("water")) {
    documentType = "Water Bill";
  } else if (fullText.toLowerCase().includes("gas")) {
    documentType = "Gas Bill";
  } else if (fullText.toLowerCase().includes("telephone") || fullText.toLowerCase().includes("phone")) {
    documentType = "Telephone Bill";
  }

  // Format to match UTILITY verification API
  // Extract billing date - look for "Billing Date" label
  let billingDate = null;
  
  // First, try to find date near "Billing Date" label
  const billingDatePattern = /billing\s+date[:\s]*(\d{2}[.\/-]\d{2}[.\/-]\d{4})/i;
  const billingDateMatch = fullText.match(billingDatePattern);
  
  if (billingDateMatch && billingDateMatch[1]) {
    const dateStr = billingDateMatch[1].replace(/\./g, "/");
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format
        billingDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  } else {
    // Fallback: look for date patterns in DD.MM.YYYY or DD/MM/YYYY format
    const datePatterns = [
      /\d{2}\.\d{2}\.\d{4}/, // DD.MM.YYYY
      /\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
      /\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
      /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    ];
    for (const pattern of datePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        const dateStr = match[0].replace(/\./g, "/");
        if (dateStr.includes("/")) {
          const parts = dateStr.split("/");
          if (parts.length === 3) {
            // Assume DD/MM/YYYY format
            billingDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        } else if (dateStr.includes("-")) {
          billingDate = dateStr;
        }
        break;
      }
    }
  }

  // Mask account number (show last 4 digits)
  const accountNoMasked = accountNumber 
    ? `XXXXXX${accountNumber.slice(-4)}` 
    : null;

  // Determine bill type
  let billType = "unknown";
  if (fullText.toLowerCase().includes("electricity") || fullText.toLowerCase().includes("power")) {
    billType = "electricity";
  } else if (fullText.toLowerCase().includes("water")) {
    billType = "water";
  } else if (fullText.toLowerCase().includes("gas")) {
    billType = "gas";
  } else if (fullText.toLowerCase().includes("telephone") || fullText.toLowerCase().includes("phone")) {
    billType = "telephone";
  }

  return {
    consumer_name: name !== "Unknown" ? name : null,
    consumer_account_no_masked: accountNoMasked,
    address: address !== "Unknown" ? address : null,
    billing_date: billingDate,
    bill_type: billType,
    ocr_confidence: 0.8,
    // Additional fields for internal use
    pin_code: pinCode,
    document_type: documentType,
  };
}

