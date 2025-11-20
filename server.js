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
import db from "./db/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_MODEL = process.env.GEMINI_MODEL;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 15);
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Attach device ID to API requests
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    req.deviceId = req.headers["x-device-id"] || null;
  }
  next();
});

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer Upload Handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
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
    cb(
      valid ? null : new Error("Only PDF / PNG / JPG / JPEG / WEBP allowed"),
      valid
    );
  },
});

// ---------- Health Check ----------
app.get("/api/health", async (req, res) => {
  try {
    const body = {
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    };

    const response = await axios.post(GEMINI_API_URL, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Working";

    res.json({ ok: true, model: GEMINI_MODEL, response: reply.trim() });
  } catch (e) {
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

  if (!files.length) {
    return res.status(400).json({ ok: false, error: "No files uploaded" });
  }

  const processedFiles = [];
  const allTexts = [];

  try {
    for (const f of files) {
      const filePath = path.isAbsolute(f.path)
        ? f.path
        : path.join(__dirname, f.path);

      const ext = path.extname(f.filename).toLowerCase();
      let text = "";

      try {
        text =
          ext === ".pdf"
            ? await extractPdfText(filePath)
            : await ocrImage(filePath);

        const cleaned = text?.trim() || "";

        if (cleaned) {
          allTexts.push(`### FILE: ${f.originalname}\n${cleaned}`);

          processedFiles.push({
            name: f.originalname,
            url: `/uploads/${f.filename}`,
            transcript: cleaned,
          });
        }
      } catch (err) {
        console.error(`Failed to extract ${f.originalname}:`, err.message);
      }
    }

    if (!allTexts.length) {
      throw new Error("No readable text extracted from any files.");
    }

    const prompt = buildPrompt(allTexts.join("\n\n---\n\n"));

    const response = await axios.post(
      GEMINI_API_URL,
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" }, timeout: 120000 }
    );

    const raw =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    let parsed;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      parsed = null;
    }

    const data = parsed || {
      summary: raw.substring(0, 500),
      key_findings: ["Analysis complete — review details below."],
      possible_red_flags: [],
      recommended_followups: [],
      questions_for_doctor: [],
      raw_response: raw,
    };

    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO analyses (device_id, file_names, transcripts, ai_output, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(
      req.deviceId,
      JSON.stringify(processedFiles),
      JSON.stringify(allTexts),
      JSON.stringify(data),
      now
    );

    res.json({
      ok: true,
      processed_files: processedFiles,
      data,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// HISTORY LIST
app.get("/api/history", (req, res) => {
  if (!req.deviceId) {
    return res.status(400).json({ ok: false, error: "Device ID missing" });
  }

  const rows = db
    .prepare(
      `SELECT id, file_names, created_at FROM analyses
       WHERE device_id = ? ORDER BY id DESC`
    )
    .all(req.deviceId);

  res.json({
    ok: true,
    history: rows.map((r) => ({
      id: r.id,
      files: JSON.parse(r.file_names),
      created_at: r.created_at,
    })),
  });
});

// HISTORY DETAILS
app.get("/api/history/:id", (req, res) => {
  const deviceId = req.deviceId;
  const id = Number(req.params.id);

  const query = db.prepare(`
    SELECT *
    FROM analyses
    WHERE id = ? AND device_id = ?
  `);

  const row = query.get(id, deviceId);

  if (!row) return res.status(404).json({ ok: false, error: "Not found" });

  res.json({
    ok: true,
    id: row.id,
    created_at: row.created_at,
    files: JSON.parse(row.file_names),
    transcripts: JSON.parse(row.transcripts),
    data: JSON.parse(row.ai_output),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Gemini model: ${GEMINI_MODEL}`);
});
