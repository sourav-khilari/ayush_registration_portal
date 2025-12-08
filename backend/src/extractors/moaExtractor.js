// src/extractors/moaExtractor.js
export function extractMOAFields(ocrTextArray = []) {
  const fullText = Array.isArray(ocrTextArray)
    ? ocrTextArray.join("\n").replace(/\r/g, "")
    : "";

  const safeTrim = (s) => (s || "").toString().trim();

  // heuristics helpers
  function findLine(regex, options = {}) {
    const flags = options.multiline ? "gmi" : "mi";
    const re = new RegExp(regex, flags);
    const match = fullText.match(re);
    return match ? match[0].trim() : null;
  }

  // Entity type: look for "LLP", "Private Limited", "Public Limited", "Company", "Partnership"
  let entity_type = null;
  if (/(\bLLP\b)/i.test(fullText)) entity_type = "LLP";
  else if (/private\s+limited/i.test(fullText)) entity_type = "Private Limited";
  else if (/public\s+limited/i.test(fullText)) entity_type = "Public Limited";
  else if (/\bcompany\b/i.test(fullText)) entity_type = "Company";
  else if (/partnership/i.test(fullText)) entity_type = "Partnership";

  // try to extract list of directors/partners
  // Look for common headings: "Directors", "Partners", "Members", "Partners/Directors"
  const directors_partners_list = [];
  const blockMatch = fullText.match(
    /(DIRECTORS?|PARTNERS?|MEMBERS?)[\s:\-]*([\s\S]{0,800}?)(?=(\n[A-Z]{2,}|$))/i
  );
  let blockText = blockMatch ? blockMatch[2] : null;

  if (!blockText) {
    // fallback: scan for lines that look like "Name - PAN (ABCDE1234F)" or lines starting with numbering
    const candidates = fullText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter(
        (l) =>
          /^(1\.|2\.|\d+\.|-)\s*?[A-Z]/.test(l) ||
          /PAN|Partner|Director/i.test(l)
      );
    blockText = candidates.join("\n");
  }

  const lines = blockText ? blockText.split(/\n+/).slice(0, 40) : [];

  for (const line of lines) {
    // try to find a name and optionally a masked id / PAN
    // Recognize "Name - PAN" or "Mr. X Y (PAN: ABCDE1234F)" or "Name  PAN-ABCDE1234F"
    const panMatch = line.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
    // try to find name by removing PAN and common words
    let name = line.replace(/\b(PAN[:\s-]*[A-Z0-9]{10})\b/i, "");
    name = name.replace(/\bDirector|Partner|Member|DIN[:\s-]*\d+\b/gi, "");
    name = name.replace(/[-•\d\.\)]+/g, " ").trim();
    // choose a more conservative name candidate: words with capital first letter
    const nameCandidate = (name.split(",")[0] || "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (nameCandidate && nameCandidate.length > 2) {
      const entry = {
        name: nameCandidate,
        id_type: panMatch ? "PAN" : undefined,
        id_no_masked: panMatch ? panMatch[0] : undefined,
      };
      // avoid duplicates
      if (!directors_partners_list.some((d) => d.name === entry.name)) {
        directors_partners_list.push(entry);
      }
    }
  }

  // If still empty, attempt to pick names from top of document (title area)
  if (directors_partners_list.length === 0) {
    const topLines = fullText.split("\n").slice(0, 40);
    for (const l of topLines) {
      if (/partner|director|member/i.test(l)) continue;
      if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(l)) {
        directors_partners_list.push({
          name: safeTrim(l.split(",")[0]),
        });
      }
      if (directors_partners_list.length >= 3) break;
    }
  }

  // Authorized signatory: look for lines "Authorised Signatory" or "For <Name>"
  let authorized_signatory = null;
  const authMatch = fullText.match(
    /Authori(s|z)ed Signatory[:\s-]*([A-Z][A-Za-z .,&'-]{2,60})/i
  );
  if (authMatch && authMatch[2]) {
    authorized_signatory = { name: safeTrim(authMatch[2]) };
  } else {
    const forMatch = fullText.match(/For\s+([A-Z][A-Za-z .,&'-]{2,60})/i);
    if (forMatch && forMatch[1])
      authorized_signatory = { name: safeTrim(forMatch[1]) };
  }

  // Extract main objects / main business purpose: lines under "Objects" or "Main Objects" or "Main Objects of the LLP/Company"
  let main_objects = null;
  const objMatch = fullText.match(
    /(OBJECTS|MAIN OBJECTS|MAIN OBJECT|OBJECTS OF THE (COMPANY|LLP|PARTNERSHIP))[\s:\-]*([\s\S]{0,500}?)(?=(\n[A-Z]{2,}|$))/i
  );
  if (objMatch && objMatch[3]) {
    main_objects = objMatch[3].replace(/\n+/g, " ").trim();
  } else {
    // fallback: find "purpose" or "business"
    const purposeMatch = fullText.match(
      /(PURPOSE|BUSINESS|OBJECTIVE)[\s:\-]*([\s\S]{0,300}?)(?=(\n[A-Z]{2,}|$))/i
    );
    if (purposeMatch && purposeMatch[2]) {
      main_objects = purposeMatch[2].replace(/\n+/g, " ").trim();
    }
  }

  // entity name: try to find top-most UPPERCASE line that looks like a name
  let entity_name = null;
  const linesTop = fullText
    .split("\n")
    .slice(0, 10)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of linesTop) {
    if (
      line.length > 4 &&
      /[A-Z][a-z]/.test(line) &&
      !/MINISTRY|GOVERNMENT|REGISTRATION|CERTIFICATE|MINISTRY/i.test(line)
    ) {
      entity_name = line;
      break;
    }
  }

  // ocr_confidence heuristic - we don't have a real score so base on lines present
  let ocr_confidence = 0.75;
  if (fullText.length < 50) ocr_confidence = 0.35;
  else if (fullText.length < 200) ocr_confidence = 0.55;

  // final tidy: ensure names are Title Case
  function titleCase(s) {
    if (!s) return s;
    return s.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
  const directors = directors_partners_list.map((d) => ({
    name: titleCase(d.name),
    id_type: d.id_type || null,
    id_no_masked: d.id_no_masked || null,
  }));

  const out = {
    entity_type: entity_type || null,
    directors_partners_list: directors,
    authorized_signatory: authorized_signatory
      ? { name: titleCase(authorized_signatory.name) }
      : null,
    main_objects: main_objects || null,
    entity_name: entity_name || null,
    ocr_confidence: Number(ocr_confidence.toFixed(2)),
    raw_text: fullText.slice(0, 4000), // include a snippet for debugging
  };

  return out;
}
