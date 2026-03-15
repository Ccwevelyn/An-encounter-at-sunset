/**
 * 数据库：无 DATABASE_URL 时用 SQLite，有则用 PostgreSQL。
 * PG 时所有 prepare().get/all/run 返回 Promise，调用处需 await。
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

if (process.env.DATABASE_URL) {
  const pgModule = await import('./db-pg.js');
  await pgModule.default.runMigrations();
  const pool = pgModule.default.pool;

  function convert(sql) {
    let i = 0;
    const pgSql = sql.replace(/datetime\s*\(\s*['"]now['"]\s*\)/gi, 'NOW()');
    return pgSql.replace(/\?/g, () => `$${++i}`);
  }
  db = {
    prepare(sql) {
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      const hasReturning = /RETURNING\s+/i.test(sql);
      let finalSql = sql;
      if (isInsert && !hasReturning) {
        const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
        const table = tableMatch ? tableMatch[1].toLowerCase() : '';
        const noIdReturning = { profiles: 'user_id', soul_answers: 'user_id', email_verifications: 'email', login_codes: 'email' };
        const returningCol = noIdReturning[table] || 'id';
        finalSql = sql.replace(/;\s*$/, '') + ` RETURNING ${returningCol}`;
      }
      return {
        get: (...params) => pool.query(convert(finalSql), params).then(r => r.rows[0]),
        all: (...params) => pool.query(convert(finalSql), params).then(r => r.rows),
        run: (...params) =>
          pool.query(convert(finalSql), params).then(r => ({
            lastInsertRowid: r.rows[0]?.id ?? r.rows[0]?.user_id ?? r.rows[0]?.email,
          })),
      };
    },
    async getTableInfo(tableName) {
      const r = await pool.query(
        `SELECT column_name AS name, data_type AS type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [tableName]
      );
      return r.rows;
    },
  };
} else {
  const Database = (await import('better-sqlite3')).default;
  const dbPath = join(__dirname, 'data.db');
  const sqlite = new Database(dbPath);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      nickname TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      degree TEXT, gender TEXT, preferred_gender TEXT, college TEXT, major TEXT,
      birthday TEXT, mbti TEXT, relationship_count TEXT, longest_relationship TEXT,
      purpose TEXT, cities TEXT, monthly_budget TEXT, hometown_province TEXT,
      love_index INTEGER, intro TEXT, photos TEXT, avatar TEXT,
      random_mode_enabled INTEGER DEFAULT 0, fate_mode_enabled INTEGER DEFAULT 0,
      random_mode_ts TEXT, updated_at TEXT DEFAULT (datetime('now'))
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
    CREATE TABLE IF NOT EXISTS soul_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL, sort_order INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS soul_answers (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, question_id INTEGER NOT NULL REFERENCES soul_questions(id), answer TEXT NOT NULL, PRIMARY KEY (user_id, question_id));
    CREATE INDEX IF NOT EXISTS idx_soul_answers_user ON soul_answers(user_id);
    CREATE TABLE IF NOT EXISTS email_verifications (email TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TEXT NOT NULL);
  `);
  ['degree', 'preferred_gender', 'avatar'].forEach(col => { try { sqlite.exec(`ALTER TABLE profiles ADD COLUMN ${col} TEXT`); } catch (_) {} });
  const seed = [
    [1, '你如何看待双方家庭或成长背景的差异？（如门当户对、父母意见等）', 1],
    [2, '发生矛盾或分歧时，你希望两个人怎样面对？', 2],
    [3, '你理想中的日常相处方式或相处节奏是怎样的？', 3],
    [4, '对你来说，伴侣身上最不能接受的一点是什么？', 4],
    [5, '若不得不异地一段时间，你会怎么看待和维系这段关系？', 5],
  ];
  seed.forEach(([id, q, o]) => { try { sqlite.exec(`INSERT OR IGNORE INTO soul_questions (id, question, sort_order) VALUES (${id}, '${q.replace(/'/g, "''")}', ${o})`); } catch (_) {} });

  db = {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      return {
        get: (...params) => Promise.resolve(stmt.get(...params)),
        all: (...params) => Promise.resolve(stmt.all(...params)),
        run: (...params) => Promise.resolve(stmt.run(...params)),
      };
    },
    async getTableInfo(tableName) {
      const rows = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
      return Promise.resolve(rows.map(r => ({ name: r.name, type: r.type || '' })));
    },
  };
}

export default db;
