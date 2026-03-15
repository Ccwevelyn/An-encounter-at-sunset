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
try {
  db.exec(`ALTER TABLE profiles ADD COLUMN avatar TEXT`);
} catch (_) {}

// 灵魂共鸣：主观题与用户文字回答（供 AI 分析匹配）
db.exec(`
  CREATE TABLE IF NOT EXISTS soul_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS soul_answers (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES soul_questions(id),
    answer TEXT NOT NULL,
    PRIMARY KEY (user_id, question_id)
  );
  CREATE INDEX IF NOT EXISTS idx_soul_answers_user ON soul_answers(user_id);
`);
// 灵魂共鸣 5 题：反映择偶/关系观，与 Onboarding（学位/学院/性别/MBTI/恋爱目的/经历/城市/花销等）不重复
try {
  db.exec(`INSERT INTO soul_questions (id, question, sort_order) VALUES (1, '你如何看待双方家庭或成长背景的差异？（如门当户对、父母意见等）', 1)`);
} catch (_) {}
try {
  db.exec(`INSERT INTO soul_questions (id, question, sort_order) VALUES (2, '发生矛盾或分歧时，你希望两个人怎样面对？', 2)`);
} catch (_) {}
try {
  db.exec(`INSERT INTO soul_questions (id, question, sort_order) VALUES (3, '你理想中的日常相处方式或相处节奏是怎样的？', 3)`);
} catch (_) {}
try {
  db.exec(`INSERT INTO soul_questions (id, question, sort_order) VALUES (4, '对你来说，伴侣身上最不能接受的一点是什么？', 4)`);
} catch (_) {}
try {
  db.exec(`INSERT INTO soul_questions (id, question, sort_order) VALUES (5, '若不得不异地一段时间，你会怎么看待和维系这段关系？', 5)`);
} catch (_) {}
// 若表中已有旧题（如「对的人」「最看重什么」），可手动改库或重跑建表；此处以新 5 题为默认
db.exec(`UPDATE soul_questions SET question = '你如何看待双方家庭或成长背景的差异？（如门当户对、父母意见等）', sort_order = 1 WHERE id = 1`);
db.exec(`UPDATE soul_questions SET question = '发生矛盾或分歧时，你希望两个人怎样面对？', sort_order = 2 WHERE id = 2`);
db.exec(`UPDATE soul_questions SET question = '你理想中的日常相处方式或相处节奏是怎样的？', sort_order = 3 WHERE id = 3`);
db.exec(`INSERT OR IGNORE INTO soul_questions (id, question, sort_order) VALUES (4, '对你来说，伴侣身上最不能接受的一点是什么？', 4)`);
db.exec(`INSERT OR IGNORE INTO soul_questions (id, question, sort_order) VALUES (5, '若不得不异地一段时间，你会怎么看待和维系这段关系？', 5)`);

// 邮箱认证：注册前发验证链接，验证通过后才可完成注册
db.exec(`
  CREATE TABLE IF NOT EXISTS email_verifications (
    email TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

export default db;
