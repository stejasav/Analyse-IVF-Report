// utils/extractPdf.js
import fs from "fs";

export async function extractPdfText(filePath) {
  try {
    // Dynamically import the CommonJS module
    const { default: pdfParse } = await import("pdf-parse");

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer, {
      max: 0, // Parse all pages
    });

    const text = (data.text || "")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text || text.length < 10) {
      throw new Error("PDF appears to be empty or contains no readable text");
    }

    return text;
  } catch (error) {
    console.error("PDF extraction error:", error.message);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}