import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite DB
const dbPath = path.join(__dirname, "history.sqlite");
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    file_names TEXT NOT NULL,      -- JSON string
    transcripts TEXT NOT NULL,     -- JSON string
    ai_output TEXT NOT NULL,       -- JSON string
    created_at TEXT NOT NULL
  );
`);

export default db;
