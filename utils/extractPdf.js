// utils/extractPdf.js
import fs from "fs";

export async function extractPdfText(filePath) {
  try {
    const { default: pdfParse } = await import("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = (data.text || "")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text || text.length < 10) {
      throw new Error("PDF appears empty or unreadable");
    }

    return text;
  } catch (error) {
    console.error("PDF extraction error:", error.message);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}