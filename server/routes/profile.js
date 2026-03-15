import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const user = await db.prepare('SELECT id, email, nickname FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const row = await db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  if (!row) {
    return res.json({ ...user, profile: null });
  }
  const profile = {
    user_id: row.user_id,
    degree: row.degree != null ? String(row.degree) : null,
    gender: row.gender,
    preferred_gender: row.preferred_gender != null ? String(row.preferred_gender) : null,
    college: row.college,
    major: row.major,
    birthday: row.birthday,
    mbti: row.mbti,
    relationship_count: row.relationship_count,
    longest_relationship: row.longest_relationship,
    purpose: row.purpose,
    cities: row.cities,
    monthly_budget: row.monthly_budget,
    hometown_province: row.hometown_province,
    love_index: row.love_index,
    intro: row.intro,
    photos: row.photos,
    avatar: row.avatar,
    random_mode_enabled: row.random_mode_enabled,
    fate_mode_enabled: row.fate_mode_enabled,
    random_mode_ts: row.random_mode_ts,
    updated_at: row.updated_at,
  };
  res.json({ ...user, profile });
});

router.put('/', async (req, res) => {
  const p = req.body?.profile || req.body || {};
  const safeStr = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
  // 所有字段均通过参数传入，不拼接 SQL，防止注入（major、college 等均安全）
  const fields = {
    degree: safeStr(p.degree),
    gender: safeStr(p.gender),
    preferred_gender: safeStr(p.preferred_gender),
    college: p.college,
    major: p.major,
    birthday: p.birthday,
    mbti: p.mbti,
    relationship_count: p.relationship_count,
    longest_relationship: p.longest_relationship,
    purpose: p.purpose,
    cities: Array.isArray(p.cities) ? JSON.stringify(p.cities) : (p.cities || null),
    monthly_budget: p.monthly_budget,
    hometown_province: p.hometown_province,
    love_index: p.love_index != null ? p.love_index : null,
    intro: p.intro,
    photos: Array.isArray(p.photos) ? JSON.stringify(p.photos) : (p.photos || null),
    avatar: p.avatar != null && p.avatar !== '' ? String(p.avatar) : null,
    random_mode_enabled: p.random_mode_enabled ? 1 : 0,
    fate_mode_enabled: p.fate_mode_enabled ? 1 : 0,
    random_mode_ts: p.random_mode_ts || null,
  };
  await db.prepare(`
    INSERT INTO profiles (user_id, degree, gender, preferred_gender, college, major, birthday, mbti, relationship_count, longest_relationship, purpose, cities, monthly_budget, hometown_province, love_index, intro, photos, avatar, random_mode_enabled, fate_mode_enabled, random_mode_ts, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      degree=excluded.degree, gender=excluded.gender, preferred_gender=excluded.preferred_gender, college=excluded.college, major=excluded.major, birthday=excluded.birthday,
      mbti=excluded.mbti, relationship_count=excluded.relationship_count, longest_relationship=excluded.longest_relationship,
      purpose=excluded.purpose, cities=excluded.cities, monthly_budget=excluded.monthly_budget,
      hometown_province=excluded.hometown_province, love_index=excluded.love_index, intro=excluded.intro, photos=excluded.photos, avatar=excluded.avatar,
      random_mode_enabled=excluded.random_mode_enabled, fate_mode_enabled=excluded.fate_mode_enabled, random_mode_ts=excluded.random_mode_ts,
      updated_at=datetime('now')
  `).run(
    req.userId,
    fields.degree,
    fields.gender,
    fields.preferred_gender,
    fields.college,
    fields.major,
    fields.birthday,
    fields.mbti,
    fields.relationship_count,
    fields.longest_relationship,
    fields.purpose,
    fields.cities,
    fields.monthly_budget,
    fields.hometown_province,
    fields.love_index,
    fields.intro,
    fields.photos,
    fields.avatar,
    fields.random_mode_enabled,
    fields.fate_mode_enabled,
    fields.random_mode_ts
  );
  res.json({ ok: true });
});

const TEST_PARTNER_ID = 0;

// 获取其他用户公开档案（用于匹配结果、聊天对象信息）
router.get('/:userId', async (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  if (targetId === req.userId) {
    return res.json({ self: true });
  }
  if (targetId === TEST_PARTNER_ID) {
    return res.json({ user: { id: TEST_PARTNER_ID, nickname: 'Test' }, profile: null });
  }
  const user = await db.prepare('SELECT id, nickname FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const profile = await db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(targetId);
  if (!profile) return res.status(404).json({ error: '该用户未完善资料' });
  const { password_hash, ...rest } = user;
  let cities = profile.cities;
  try {
    cities = typeof cities === 'string' ? JSON.parse(cities) : cities;
  } catch {
    cities = [];
  }
  res.json({ user: rest, profile: { ...profile, cities } });
});

export default router;
