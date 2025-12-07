/**
 * OCR Processing Utility
 * Handles OCR extraction and field extraction from document images
 */
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { getExtractor } from "../extractors/index.js";

/**
 * Process OCR for document images and extract fields
 * @param {Array} pageImages - Array of page image objects with url property
 * @param {string} docCategory - Document category (e.g., "founder_id", "address_proof")
 * @returns {Promise<Object>} Object containing ocrResults, allText, and extractedData
 */
export async function processOCRAndExtract(pageImages, docCategory) {
  const ocrResults = [];
  let allText = [];

  // Process each page image through OCR
  for (const img of pageImages) {
    const absPath = path.join(
      process.cwd(),
      "public",
      img.url.replace(/^\/uploads\//, "uploads/")
    );

    if (!fs.existsSync(absPath)) {
      console.warn(`⚠️ Image not found: ${absPath}`);
      continue;
    }

    const form = new FormData();
    form.append("image", fs.createReadStream(absPath));

    console.log(`🔍 Sending OCR for: ${absPath}`);

    try {
      const response = await axios.post(process.env.OCR_API_URL, form, {
        headers: form.getHeaders(),
      });

      console.log("✅ OCR Response:", response.data);

      const textArray = Array.isArray(response.data.text)
        ? response.data.text
        : [String(response.data.text)];

      ocrResults.push({
        image: path.basename(absPath),
        result: { text: textArray },
      });

      allText.push(...textArray);
    } catch (error) {
      console.error(`❌ OCR failed for ${absPath}:`, error.message);
      // Continue processing other pages even if one fails
    }
  }

  // Extract key fields using appropriate extractor
  const extractorFn = getExtractor(docCategory);
  let extractedData = {};

  if (allText.length === 0) {
    // If OCR failed completely, return minimal data
    console.warn(`⚠️ No OCR text extracted for ${docCategory}`);
    extractedData = {
      text: "",
      ocr_confidence: 0.0,
      ocr_failed: true,
    };
  } else if (extractorFn) {
    extractedData = extractorFn(allText);
    console.log(`🧩 Extracted fields for ${docCategory}:`, extractedData);
  } else {
    extractedData = {
      text: allText.join(" "),
      ocr_confidence: 0.8,
    };
    console.log(`⚠️ No extractor found for ${docCategory}`);
  }

  return {
    ocrResults,
    allText,
    extractedData,
  };
}
