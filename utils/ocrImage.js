// utils/ocrImage.js
import Tesseract from "tesseract.js";
import sharp from "sharp";

export async function ocrImage(filePath) {
  try {
    const preprocessed = await sharp(filePath)
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    const { data } = await Tesseract.recognize(preprocessed, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = (data.text || "")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text || text.length < 10) {
      throw new Error("Image appears to contain no readable text");
    }

    return text;
  } catch (error) {
    console.error("OCR error:", error.message);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}
