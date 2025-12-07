// /**
//  * Extractor for Address Proof documents (Utility bills, Bank statements, etc.)
//  */
// export function extractAddressProofFields(ocrTextArray) {
//   const fullText = ocrTextArray.join(" ");

//   // Extract address - look for address lines (usually contains street, city, pin)
//   const addressKeywords = ["apartment", "road", "street", "lane", "colony", "society", "village", "city", "state", "pin", "p.o.", "post"];
//   const addressLines = [];
  
//   // Look for lines that contain address-like patterns
//   for (let i = 0; i < ocrTextArray.length; i++) {
//     const line = ocrTextArray[i].trim();
//     const lowerLine = line.toLowerCase();
    
//     // Skip if it's a header, company name, or number-only line
//     if (line.length < 10 || 
//         lowerLine.includes("company") || 
//         lowerLine.includes("ltd") ||
//         lowerLine.includes("government") ||
//         /^\d+$/.test(line)) {
//       continue;
//     }
    
//     // Check if line looks like an address
//     const hasAddressKeyword = addressKeywords.some((keyword) => lowerLine.includes(keyword));
//     const hasPinCode = /\d{6}/.test(line);
//     const hasStreetPattern = /[A-Z][a-z]+\s+(road|street|lane|colony|apartment|society)/i.test(line);
    
//     if (hasAddressKeyword || hasPinCode || hasStreetPattern) {
//       addressLines.push(line);
//       // Usually address is 2-4 consecutive lines
//       if (addressLines.length >= 3) break;
//     }
//   }
  
//   const address = addressLines.length > 0 ? addressLines.join(", ") : "Unknown";

//   // Extract PIN code (6 digits)
//   const pinMatch = fullText.match(/\b\d{6}\b/);
//   const pinCode = pinMatch ? pinMatch[0] : null;

//   // Extract consumer name - look for name patterns, avoid company names
//   // Usually appears early in the document, before address
//   let name = "Unknown";
//   for (let i = 0; i < Math.min(15, ocrTextArray.length); i++) {
//     const trimmed = ocrTextArray[i].trim();
    
//     // Skip if it's clearly not a name
//     if (trimmed.length < 3 || 
//         trimmed.length > 50 ||
//         trimmed.toLowerCase().includes("bank") ||
//         trimmed.toLowerCase().includes("statement") ||
//         trimmed.toLowerCase().includes("utility") ||
//         trimmed.toLowerCase().includes("bill") ||
//         trimmed.toLowerCase().includes("company") ||
//         trimmed.toLowerCase().includes("ltd") ||
//         trimmed.toLowerCase().includes("limited") ||
//         trimmed.toLowerCase().includes("enterprise") ||
//         trimmed.toLowerCase().includes("government") ||
//         trimmed.toLowerCase().includes("distribution") ||
//         /^\d+$/.test(trimmed) ||
//         trimmed.includes(":") && !trimmed.match(/^[A-Z][a-z]+ [A-Z][a-z]+:/)) {
//       continue;
//     }
    
//     // Look for person names (typically 2-3 words, each starting with capital)
//     // Pattern: FirstName LastName or FirstName MiddleName LastName
//     if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,2}$/.test(trimmed)) {
//       name = trimmed;
//       break;
//     }
//   }

//   // Extract consumer account number - look for "ConsumerId" or "Consumer ID" pattern
//   let accountNumber = null;
//   const consumerIdPattern = /consumer\s*id[:\s]*(\d{6,12})/i;
//   const consumerIdMatch = fullText.match(consumerIdPattern);
//   if (consumerIdMatch && consumerIdMatch[1]) {
//     accountNumber = consumerIdMatch[1];
//   } else {
//     // Fallback: look for account numbers near "Consumer" keyword
//     const accountMatch = fullText.match(/\b\d{9,12}\b/);
//     accountNumber = accountMatch ? accountMatch[0] : null;
//   }

//   // Extract document type (utility bill, bank statement, etc.)
//   let documentType = "Unknown";
//   if (fullText.toLowerCase().includes("bank") || fullText.toLowerCase().includes("statement")) {
//     documentType = "Bank Statement";
//   } else if (fullText.toLowerCase().includes("electricity") || fullText.toLowerCase().includes("power")) {
//     documentType = "Electricity Bill";
//   } else if (fullText.toLowerCase().includes("water")) {
//     documentType = "Water Bill";
//   } else if (fullText.toLowerCase().includes("gas")) {
//     documentType = "Gas Bill";
//   } else if (fullText.toLowerCase().includes("telephone") || fullText.toLowerCase().includes("phone")) {
//     documentType = "Telephone Bill";
//   }

//   // Format to match UTILITY verification API
//   // Extract billing date - look for "Billing Date" label
//   let billingDate = null;
  
//   // First, try to find date near "Billing Date" label
//   const billingDatePattern = /billing\s+date[:\s]*(\d{2}[.\/-]\d{2}[.\/-]\d{4})/i;
//   const billingDateMatch = fullText.match(billingDatePattern);
  
//   if (billingDateMatch && billingDateMatch[1]) {
//     const dateStr = billingDateMatch[1].replace(/\./g, "/");
//     if (dateStr.includes("/")) {
//       const parts = dateStr.split("/");
//       if (parts.length === 3) {
//         // Assume DD/MM/YYYY format
//         billingDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//       }
//     }
//   } else {
//     // Fallback: look for date patterns in DD.MM.YYYY or DD/MM/YYYY format
//     const datePatterns = [
//       /\d{2}\.\d{2}\.\d{4}/, // DD.MM.YYYY
//       /\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
//       /\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
//       /\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
//     ];
//     for (const pattern of datePatterns) {
//       const match = fullText.match(pattern);
//       if (match) {
//         const dateStr = match[0].replace(/\./g, "/");
//         if (dateStr.includes("/")) {
//           const parts = dateStr.split("/");
//           if (parts.length === 3) {
//             // Assume DD/MM/YYYY format
//             billingDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
//           }
//         } else if (dateStr.includes("-")) {
//           billingDate = dateStr;
//         }
//         break;
//       }
//     }
//   }

//   // Mask account number (show last 4 digits)
//   const accountNoMasked = accountNumber 
//     ? `XXXXXX${accountNumber.slice(-4)}` 
//     : null;

//   // Determine bill type
//   let billType = "unknown";
//   if (fullText.toLowerCase().includes("electricity") || fullText.toLowerCase().includes("power")) {
//     billType = "electricity";
//   } else if (fullText.toLowerCase().includes("water")) {
//     billType = "water";
//   } else if (fullText.toLowerCase().includes("gas")) {
//     billType = "gas";
//   } else if (fullText.toLowerCase().includes("telephone") || fullText.toLowerCase().includes("phone")) {
//     billType = "telephone";
//   }

//   return {
//     consumer_name: name !== "Unknown" ? name : null,
//     consumer_account_no_masked: accountNoMasked,
//     address: address !== "Unknown" ? address : null,
//     billing_date: billingDate,
//     bill_type: billType,
//     ocr_confidence: 0.8,
//     // Additional fields for internal use
//     pin_code: pinCode,
//     document_type: documentType,
//   };
// }



/**
 * Improved extractor for Address Proof documents (Utility bills, Bank statements, etc.)
 * Usage: extractAddressProofFields(ocrTextArray)
 */
export function extractAddressProofFields(ocrTextArray) {
  // Normalize and filter blank lines
  const arr = (ocrTextArray || []).map(s => (s || "").trim()).filter(Boolean);
  const fullText = arr.join(" ");

  // Helpers
  const isHeaderLike = (line) => {
    const low = line.toLowerCase();
    return /helpline|invoice|bill-|internet copy|customer care|phone|call center|toll free|distribution|company|ltd|government|enterprise/.test(low);
  };

  const nameRegex = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}|[A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})$/;
  const dateRegexes = [
    /\b(\d{2}\.\d{2}\.\d{4})\b/, // 08.12.2020
    /\b(\d{2}\/\d{2}\/\d{4})\b/, // 08/12/2020
    /\b(\d{2}-\d{2}-\d{4})\b/,   // 08-12-2020
    /\b(\d{4}-\d{2}-\d{2})\b/    // 2020-12-08
  ];

  const normalizeDateToISO = (dateStr) => {
    if (!dateStr) return null;
    const d = dateStr.replace(/\./g, "/").replace(/-/g, "/");
    const parts = d.split("/");
    if (parts.length === 3) {
      // If looks like YYYY/MM/DD
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
      // Assume DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    return null;
  };

  // 1) Extract consumer name
  let consumerName = null;
  // Strategy A: name often right after "DATE" or "Name" or similar label
  for (let i = 0; i < arr.length; i++) {
    const low = arr[i].toLowerCase();
    if (/\bdate\b/.test(low) || /\bname\b/.test(low) || /\bbill to\b/.test(low) || /\bcustomer\b/.test(low)) {
      // look ahead up to 3 lines for a plausible person name
      for (let j = i+1; j <= i+3 && j < arr.length; j++) {
        const candidate = arr[j].replace(/[:"]/g, "").trim();
        if (!candidate) continue;
        if (!isHeaderLike(candidate) && nameRegex.test(candidate)) {
          consumerName = candidate;
          break;
        }
      }
      if (consumerName) break;
    }
  }

  // Strategy B: fallback scan first ~20 lines for a plausible name but exclude headers
  if (!consumerName) {
    for (let i = 0; i < Math.min(arr.length, 20); i++) {
      const line = arr[i].replace(/[:"]/g, "").trim();
      if (!line || isHeaderLike(line)) continue;
      if (nameRegex.test(line)) {
        consumerName = line;
        break;
      }
    }
  }

  // 2) Extract address
  let address = null;
  const addressKeywords = ["apartment", "apprt", "b-", "flat", "block", "colony", "society", "p.o.", "p.o", "po", "pin", "pincode", "pin -", "village", "road", "street"];
  const blacklistAddress = [/helpline|phone|call center|toll free|customer care|invoice|bill-/i];

  // Find promising start index that contains apartment or building keywords (prefer the quoted APARTMENT line)
  let addrStart = -1;
  for (let i = 0; i < arr.length; i++) {
    const low = arr[i].toLowerCase();
    if (addressKeywords.some(k => low.includes(k))) {
      // ensure it's not a blacklisted support/company line
      if (!blacklistAddress.some(rx => rx.test(arr[i]))) {
        addrStart = i;
        break;
      }
    }
  }

  if (addrStart !== -1) {
    // Collect up to next 4 lines (stop if we reach a header-like line)
    const pieces = [];
    for (let j = addrStart; j < Math.min(arr.length, addrStart + 5); j++) {
      const line = arr[j].replace(/["]+/g, "").trim();
      if (!line) continue;
      // stop on clear header lines (eg. 'Prev. Read Date', 'Invoice No' etc.)
      if (/prev\.? read|invoice no|meter no|billing date|consumerid|next reading date|business partner/i.test(line)) break;
      // skip blacklisted address-like noise (phone/company)
      if (isHeaderLike(line)) continue;
      pieces.push(line);
      // if we got a pin in this line, we can break
      if (/\b\d{6}\b/.test(line) || /pin\s*-?\s*\d{6}/i.test(line)) break;
    }
    // If last piece doesn't contain pin, try to find pin below in nearby lines
    if (!pieces.some(p => /\b\d{6}\b/.test(p))) {
      for (let k = addrStart; k < Math.min(arr.length, addrStart + 7); k++) {
        const p = arr[k];
        const pinMatch = p.match(/\b\d{6}\b/);
        if (pinMatch) {
          pieces.push(`Pin - ${pinMatch[0]}`);
          break;
        }
      }
    }
    // join pieces by comma and remove duplicate commas/spaces
    address = pieces.join(", ").replace(/\s*,\s*/g, ",").replace(/,+/g, ",").trim();
  } else {
    // fallback: try to assemble address from lines that include pin and their preceding 2 lines
    let pinIndex = -1;
    for (let i = 0; i < arr.length; i++) {
      if (/\b\d{6}\b/.test(arr[i]) || /pin\s*-?\s*\d{6}/i.test(arr[i])) {
        pinIndex = i;
        break;
      }
    }
    if (pinIndex !== -1) {
      const pieces = [];
      for (let j = Math.max(0, pinIndex - 3); j <= pinIndex; j++) {
        const line = arr[j].replace(/["]+/g, "").trim();
        if (!line || isHeaderLike(line)) continue;
        pieces.push(line);
      }
      address = pieces.join(", ").replace(/\s*,\s*/g, ",").replace(/,+/g, ",").trim();
    }
  }

  // Clean address and ensure "Pin - <6digit>" at end
  if (address) {
    // If address already has a pin, good. Else try to attach one found anywhere
    if (!/\b\d{6}\b/.test(address)) {
      const pinAnywhere = fullText.match(/\b\d{6}\b/);
      if (pinAnywhere) address = `${address},Pin - ${pinAnywhere[0]}`;
    }
    // tidy spaces and commas
    address = address.replace(/\s*,\s*/g, ",").replace(/,+/g, ",").replace(/^\s*,|,\s*$/g, "");
  }

  // 3) Extract PIN code (6 digits)
  const pinMatch = fullText.match(/\b(\d{6})\b/);
  const pinCode = pinMatch ? pinMatch[1] : null;

  // 4) Extract Consumer Account Number (ConsumerId) - handles separated tokens
  let accountNumber = null;
  // search for token containing "consumer" then look ahead for a number
  for (let i = 0; i < arr.length; i++) {
    if (/consumer/i.test(arr[i])) {
      // look ahead up to 5 tokens for a number
      for (let j = i; j <= Math.min(i + 6, arr.length - 1); j++) {
        const digits = (arr[j] || "").match(/\b(\d{6,12})\b/);
        if (digits) {
          accountNumber = digits[1];
          break;
        }
      }
      if (accountNumber) break;
    }
  }
  // fallback: any 9-12 digit number in document
  if (!accountNumber) {
    const anyAcc = fullText.match(/\b(\d{9,12})\b/);
    if (anyAcc) accountNumber = anyAcc[1];
  }

  // 5) Extract Billing Date
  let billingDate = null;
  // Find "Billing Date" label and take the next token that matches a date
  for (let i = 0; i < arr.length; i++) {
    if (/billing\s*date/i.test(arr[i])) {
      // look ahead for date tokens
      for (let j = i + 1; j <= Math.min(i + 4, arr.length - 1); j++) {
        for (const rx of dateRegexes) {
          const m = arr[j].match(rx);
          if (m && m[1]) {
            billingDate = normalizeDateToISO(m[1]);
            break;
          }
        }
        if (billingDate) break;
      }
      if (billingDate) break;
    }
  }
  // fallback: first date-looking token in whole text (but prefer ones near "Billing" or "Bill")
  if (!billingDate) {
    // try to find date near "Billing" or "Bill"
    let found = false;
    for (let i = 0; i < arr.length && !found; i++) {
      if (/bill/i.test(arr[i])) {
        for (let j = i; j < Math.min(i + 8, arr.length); j++) {
          for (const rx of dateRegexes) {
            const m = arr[j].match(rx);
            if (m && m[1]) {
              billingDate = normalizeDateToISO(m[1]);
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    }
    if (!found) {
      // absolute fallback: first date in doc
      for (const rx of dateRegexes) {
        const m = fullText.match(rx);
        if (m && m[1]) {
          billingDate = normalizeDateToISO(m[1]);
          break;
        }
      }
    }
  }

  // 6) Document type and bill type
  const lowerText = fullText.toLowerCase();
  let documentType = "Unknown";
  if (lowerText.includes("bank") && lowerText.includes("statement")) documentType = "Bank Statement";
  else if (lowerText.includes("electricity") || lowerText.includes("power")) documentType = "Electricity Bill";
  else if (lowerText.includes("water")) documentType = "Water Bill";
  else if (lowerText.includes("gas")) documentType = "Gas Bill";
  else if (lowerText.includes("telephone") || lowerText.includes("phone")) documentType = "Telephone Bill";

  let billType = "unknown";
  if (/electricity|power/.test(lowerText)) billType = "electricity";
  else if (/water/.test(lowerText)) billType = "water";
  else if (/gas/.test(lowerText)) billType = "gas";
  else if (/telephone|phone/.test(lowerText)) billType = "telephone";

  // Mask account number (show last 4 digits)
  const accountNoMasked = accountNumber ? `XXXXXX${accountNumber.slice(-4)}` : null;

  // Final fallbacks to ensure you get what you want in this sample:
  // If consumerName still null, try the line immediately after 'DATE' token (common in your sample)
  if (!consumerName) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (/^\s*date\s*$/i.test(arr[i])) {
        const cand = arr[i+1].replace(/[:"]/g, "").trim();
        if (cand && !isHeaderLike(cand)) consumerName = cand;
        break;
      }
    }
  }

  return {
    consumer_name: consumerName || null,
    consumer_account_no_masked: accountNoMasked,
    address: address || null,
    billing_date: billingDate || null,
    bill_type: billType,
    ocr_confidence: 0.8,
    // Additional internal fields
    pin_code: pinCode,
    document_type: documentType,
  };
}
