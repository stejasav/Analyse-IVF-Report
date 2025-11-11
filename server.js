// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";
import { fileURLToPath } from "url";

import { ocrImage } from "./utils/ocrImage.js";
import { buildPrompt } from "./utils/prompt.js";
import { extractPdfText } from "./utils/extractPdf.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 15);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    cb(null, Date.now() + "_" + safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      /pdf|png|jpg|jpeg|webp/i.test(file.mimetype) ||
      /\.(pdf|png|jpg|jpeg|webp)$/i.test(file.originalname);
    if (!ok) return cb(new Error("Only PDF / PNG / JPG / JPEG / WEBP allowed"));
    cb(null, true);
  },
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const r = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 5000 });
    res.json({ ok: true, model: OLLAMA_MODEL, tags: r.data });
  } catch (e) {
    console.error("HEALTH CHECK ERROR:", e.message);
    res
      .status(500)
      .json({
        ok: false,
        error: "Ollama not reachable. Make sure Ollama is running.",
      });
  }
});

// Main route: upload + analyze
app.post("/api/analyze", upload.array("files", 10), async (req, res) => {
  const files = req.files || [];
  console.log(`📁 Received ${files.length} files for analysis`);

  if (!files.length) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  let allTexts = [];
  const processedFiles = [];

  try {
    // Step 1: Extract text from all files
    for (const f of files) {
      console.log(`🔍 Processing: ${f.originalname}`);
      const ext = path.extname(f.filename).toLowerCase();
      let text = "";

      try {
        if (ext === ".pdf") {
          text = await extractPdfText(path.join(__dirname, f.path));
          console.log(`✅ PDF extracted: ${text.length} characters`);
        } else {
          text = await ocrImage(path.join(__dirname, f.path));
          console.log(`✅ Image OCR completed: ${text.length} characters`);
        }

        if (text && text.trim().length > 0) {
          allTexts.push(`### FILE: ${f.originalname}\n${text}`.trim());
          processedFiles.push(f.originalname);
        } else {
          console.warn(`⚠️ No text extracted from ${f.originalname}`);
        }
      } catch (fileError) {
        console.error(
          `❌ Error processing ${f.originalname}:`,
          fileError.message
        );
        // Continue with other files
      }
    }

    if (allTexts.length === 0) {
      throw new Error(
        "Could not extract text from any of the uploaded files. Please ensure files are readable and contain text."
      );
    }

    const joined = allTexts.join("\n\n---\n\n");
    console.log(`📝 Total extracted text: ${joined.length} characters`);

    // Step 2: Build prompt
    const prompt = buildPrompt(joined);
    console.log(`🤖 Sending to Ollama model: ${OLLAMA_MODEL}`);

    // Step 3: Call Ollama with timeout
    const response = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      },
      {
        timeout: 120000, // 2 minutes timeout
        headers: { "Content-Type": "application/json" },
      }
    );

    const raw = response.data?.response || "";
    console.log(`📤 Ollama response length: ${raw.length} characters`);

    let parsed;
    try {
      // Try to extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
        console.log("✅ Successfully parsed JSON response");
      } else {
        console.warn("⚠️ No JSON found in response, using raw format");
      }
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError.message);
      parsed = null;
    }

    // Step 4: Clean up uploaded files
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(__dirname, f.path));
      } catch (unlinkError) {
        console.error(
          `⚠️ Could not delete ${f.filename}:`,
          unlinkError.message
        );
      }
    }

    // Step 5: Return response
    if (!parsed) {
      // Create a fallback structured response from raw text
      return res.json({
        ok: true,
        format: "json",
        data: {
          summary: raw.substring(0, 500) + (raw.length > 500 ? "..." : ""),
          key_findings: [
            "Analysis completed. Please review the full response below.",
          ],
          possible_red_flags: [],
          recommended_followups: [],
          questions_for_doctor: [],
          disclaimer:
            "This is an AI-generated analysis for educational purposes only. Always consult with your healthcare provider.",
          raw_response: raw,
        },
        processed_files: processedFiles,
      });
    }

    res.json({
      ok: true,
      format: "json",
      data: parsed,
      processed_files: processedFiles,
    });
  } catch (err) {
    console.error("❌ ANALYSIS ERROR:", err.message);
    console.error(err.stack);

    // Cleanup files on error
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(__dirname, f.path));
      } catch {}
    }

    res.status(500).json({
      error: err.message || "Failed to analyze files",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Ollama host: ${OLLAMA_HOST}`);
  console.log(`🤖 Model: ${OLLAMA_MODEL}`);
});