/**
 * PostgreSQL 连接与建表。当存在 DATABASE_URL 时由 db.js 使用。
 */
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.startsWith('postgres://') && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function convertQuestionToDollar(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        nickname TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        degree TEXT,
        gender TEXT,
        preferred_gender TEXT,
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
        avatar TEXT,
        random_mode_enabled INTEGER DEFAULT 0,
        fate_mode_enabled INTEGER DEFAULT 0,
        random_mode_ts TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        user_a INTEGER NOT NULL REFERENCES users(id),
        user_b INTEGER NOT NULL REFERENCES users(id),
        mode TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_a, user_b, mode)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL REFERENCES matches(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_a, user_b);
      CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);

      CREATE TABLE IF NOT EXISTS soul_questions (
        id SERIAL PRIMARY KEY,
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

      CREATE TABLE IF NOT EXISTS email_verifications (
        email TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS login_codes (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);
    const seed = await client.query('SELECT COUNT(*) FROM soul_questions');
    if (Number(seed.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO soul_questions (id, question, sort_order) VALUES
        (1, '你如何看待双方家庭或成长背景的差异？（如门当户对、父母意见等）', 1),
        (2, '发生矛盾或分歧时，你希望两个人怎样面对？', 2),
        (3, '你理想中的日常相处方式或相处节奏是怎样的？', 3),
        (4, '对你来说，伴侣身上最不能接受的一点是什么？', 4),
        (5, '若不得不异地一段时间，你会怎么看待和维系这段关系？', 5)
        ON CONFLICT (id) DO NOTHING
      `);
    }
  } finally {
    client.release();
  }
}

export default {
  pool,
  convertQuestionToDollar,
  runMigrations,
};
