/**
 * Extractor for Business Plan / Proposal documents
 */
export function extractBusinessPitchFields(ocrTextArray) {
  const fullText = ocrTextArray.join(" ");

  // Extract company/startup name (usually in title or first few lines)
  const companyNameLine = ocrTextArray.find(
    (line, index) =>
      index < 5 && // Usually in first 5 lines
      /^[A-Z][A-Za-z\s&]+$/.test(line.trim()) &&
      line.trim().length > 3 &&
      !line.toLowerCase().includes("business") &&
      !line.toLowerCase().includes("plan") &&
      !line.toLowerCase().includes("proposal")
  );
  const companyName = companyNameLine ? companyNameLine.trim() : "Unknown";

  // Extract key sections (Executive Summary, Market Analysis, etc.)
  const sections = [];
  const sectionKeywords = [
    "executive summary",
    "market analysis",
    "business model",
    "financial projections",
    "team",
    "products",
    "services",
    "competition",
    "marketing strategy",
  ];

  for (const keyword of sectionKeywords) {
    if (fullText.toLowerCase().includes(keyword)) {
      sections.push(keyword);
    }
  }

  // Extract contact information (email, phone)
  const emailMatch = fullText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const email = emailMatch ? emailMatch[0] : null;

  const phoneMatch = fullText.match(/\b\d{10}\b/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  // Extract key metrics if mentioned (revenue, funding, etc.)
  const revenueMatch = fullText.match(/revenue[:\s]+[₹$]?\s*(\d+[,\d]*)/i);
  const revenue = revenueMatch ? revenueMatch[1] : null;

  // Count pages (approximate based on content length)
  const estimatedPages = Math.ceil(fullText.length / 2000);

  return {
    company_name: companyName,
    sections_found: sections,
    email: email,
    phone: phone,
    revenue_mentioned: revenue,
    estimated_pages: estimatedPages,
    ocr_confidence: 0.75,
  };
}




