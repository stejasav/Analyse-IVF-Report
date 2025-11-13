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

// ---------- Setup ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 15);
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;

// ---------- Multer setup ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const valid = /\.(pdf|png|jpg|jpeg|webp)$/i.test(file.originalname);
    if (!valid)
      return cb(new Error("Only PDF / PNG / JPG / JPEG / WEBP allowed"));
    cb(null, true);
  },
});

// ---------- Health Check ----------
app.get("/api/health", async (req, res) => {
  try {
    console.log("🌐 Pinging Gemini model:", GEMINI_MODEL);
    const response = await axios.post(
      GEMINI_API_URL,
      { contents: [{ role: "user", parts: [{ text: "ping" }] }] },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );

    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "pong";
    console.log("✅ Gemini responded:", reply);
    res.json({ ok: true, model: GEMINI_MODEL, response: reply.trim() });
  } catch (e) {
    console.error("❌ Health check failed:", e.response?.data || e.message);
    res.status(500).json({
      ok: false,
      error:
        e.response?.data?.error?.message ||
        "Gemini not reachable or invalid API key.",
    });
  }
});

// ---------- Analyze Route ----------
app.post("/api/analyze", upload.array("files", 10), async (req, res) => {
  const files = req.files || [];
  console.log(`📂 Received ${files.length} file(s) for analysis`);

  if (!files.length)
    return res.status(400).json({ ok: false, error: "No files uploaded" });

  const processedFiles = [];
  const allTexts = [];

  try {
    // Step 1: Extract text from PDFs or images
    for (const f of files) {
      const filePath = path.isAbsolute(f.path) ? f.path : path.join(__dirname, f.path);
      const ext = path.extname(f.filename).toLowerCase();
      let text = "";

      try {
        text =
          ext === ".pdf"
            ? await extractPdfText(filePath)
            : await ocrImage(filePath);

        if (text?.trim()) {
          allTexts.push(`### FILE: ${f.originalname}\n${text.trim()}`);
          processedFiles.push(f.originalname);
          console.log(`✅ Extracted text from: ${f.originalname}`);
        } else {
          console.warn(`⚠️ No readable text in: ${f.originalname}`);
        }
      } catch (err) {
        console.error(
          `❌ Extraction failed for ${f.originalname}: ${err.message}`
        );
      } finally {
        // Always cleanup individual file
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }

    if (allTexts.length === 0)
      throw new Error("No readable text extracted from any files.");

    // Step 2: Build prompt
    const prompt = buildPrompt(allTexts.join("\n\n---\n\n"));
    console.log("🤖 Sending prompt to Gemini model...");

    // Step 3: Send to Gemini API
    const response = await axios.post(
      GEMINI_API_URL,
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" }, timeout: 120000 }
    );

    const raw =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    console.log(`📤 Received Gemini response (${raw.length} chars)`);

    // Step 4: Try to parse JSON strictly
    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      console.log("✅ JSON parsed successfully");
    } catch (parseErr) {
      console.warn("⚠️ JSON parse failed, using fallback:", parseErr.message);
      parsed = null;
    }

    // Step 5: Build final structured response
    const data = parsed || {
      summary: raw.substring(0, 500) + (raw.length > 500 ? "..." : ""),
      key_findings: ["Analysis complete — review details below."],
      possible_red_flags: [],
      recommended_followups: [],
      questions_for_doctor: [],
      disclaimer:
        "AI-generated analysis for educational purposes only. Always consult your healthcare provider.",
      raw_response: raw,
    };

    res.json({
      ok: true,
      format: "json",
      processed_files: processedFiles,
      data,
    });
  } catch (err) {
    console.error("❌ ANALYSIS ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Gemini model: ${GEMINI_MODEL}`);
});
