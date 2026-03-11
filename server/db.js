import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    nickname TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    degree TEXT,
    gender TEXT,
    college TEXT,
    major TEXT,
    birthday TEXT,
    mbti TEXT,
    relationship_count TEXT,
    longest_relationship TEXT,
    purpose TEXT,
    cities TEXT,
    monthly_budget TEXT,
    hometown_province TEXT,
    love_index INTEGER,
    intro TEXT,
    photos TEXT,
    random_mode_enabled INTEGER DEFAULT 0,
    fate_mode_enabled INTEGER DEFAULT 0,
    random_mode_ts TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER NOT NULL REFERENCES users(id),
    user_b INTEGER NOT NULL REFERENCES users(id),
    mode TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_a, user_b, mode)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_a, user_b);
  CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
`);

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN degree TEXT`);
} catch (_) {}
try {
  db.exec(`ALTER TABLE profiles ADD COLUMN preferred_gender TEXT`);
} catch (_) {}

export default db;
