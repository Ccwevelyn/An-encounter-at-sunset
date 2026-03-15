/**
 * 简易数据库管理 API：仅当设置了 ADMIN_SECRET 且请求带正确 secret 时可用。
 * 用于在 Render 等部署环境下通过浏览器查看/编辑 SQLite 数据。
 */
import { Router } from 'express';
import db from '../db.js';

const router = Router();
const ALLOWED_TABLES = ['users', 'profiles', 'matches', 'messages', 'soul_questions', 'soul_answers'];
const PK_COL = { users: 'id', profiles: 'user_id', matches: 'id', messages: 'id', soul_questions: 'id' };
// soul_answers 主键为 (user_id, question_id)，单行查询用 pkVal 格式 "user_id,question_id"

function checkSecret(req) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const given = req.query.secret || req.headers['x-admin-secret'] || '';
  return given === secret;
}

router.use((req, res, next) => {
  if (!checkSecret(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

// 表列表
router.get('/tables', (req, res) => {
  res.json({ tables: ALLOWED_TABLES });
});

// 列表用：大字段用占位符，避免响应过大导致只看到部分用户
const LIST_PLACEHOLDERS = {
  users: { password_hash: '[已隐藏]' },
  profiles: { avatar: '[图片]', photos: '[图片]', intro: '[简介]' },
};
function rowForList(name, row) {
  const placeholders = LIST_PLACEHOLDERS[name];
  if (!placeholders) return row;
  const out = { ...row };
  for (const [col, placeholder] of Object.entries(placeholders)) {
    const val = out[col];
    if (val != null && String(val).length > 50) out[col] = placeholder;
    if (col === 'intro' && val != null && String(val).length > 0) out[col] = placeholder;
  }
  return out;
}

// 表结构 + 数据（列表：不含大图/密码全文）
router.get('/table/:name', async (req, res) => {
  const name = req.params.name;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  try {
    const columns = await db.getTableInfo(name);
    const rows = await db.prepare(`SELECT * FROM ${name}`).all();
    const rowsForList = rows.map((r) => rowForList(name, r));
    res.json({ columns: columns.map((c) => ({ name: c.name, type: c.type || '' })), rows: rowsForList });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 单行完整数据（编辑用）；soul_answers 的 pkVal 格式为 "user_id,question_id"
router.get('/table/:name/row/:pkVal', async (req, res) => {
  const name = req.params.name;
  const pkVal = req.params.pkVal;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  try {
    if (name === 'soul_answers') {
      const parts = pkVal.split(/[,._]/);
      if (parts.length !== 2) return res.status(400).json({ error: 'Use pkVal format: user_id,question_id' });
      const row = await db.prepare('SELECT * FROM soul_answers WHERE user_id = ? AND question_id = ?').get(Number(parts[0]), Number(parts[1]));
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.json(row);
    }
    const pk = PK_COL[name];
    if (!pk) return res.status(400).json({ error: 'No primary key' });
    const row = await db.prepare(`SELECT * FROM ${name} WHERE ${pk} = ?`).get(pkVal);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新一行（body: { id 或 user_id, ...fields }）；soul_answers 需 body.user_id + body.question_id
router.post('/table/:name/row', async (req, res) => {
  const name = req.params.name;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  const body = req.body || {};
  if (name === 'soul_answers') {
    const userId = body.user_id != null ? Number(body.user_id) : null;
    const questionId = body.question_id != null ? Number(body.question_id) : null;
    if (userId == null || questionId == null) return res.status(400).json({ error: 'Missing user_id and question_id' });
    if (!('answer' in body)) return res.status(400).json({ error: 'No fields to update' });
    try {
      await db.prepare('UPDATE soul_answers SET answer = ? WHERE user_id = ? AND question_id = ?').run(String(body.answer), userId, questionId);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  const pk = PK_COL[name];
  if (!pk) return res.status(400).json({ error: 'No primary key' });
  const id = body[pk];
  if (id == null) return res.status(400).json({ error: `Missing ${pk}` });
  const columns = await db.getTableInfo(name);
  const colNames = columns.map((c) => c.name).filter((n) => n !== pk);
  const updates = [];
  const values = [];
  for (const col of colNames) {
    if (col in body) {
      updates.push(`${col} = ?`);
      values.push(body[col]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  try {
    await db.prepare(`UPDATE ${name} SET ${updates.join(', ')} WHERE ${pk} = ?`).run(...values);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 删除一行（body: { id 或 user_id }）；soul_answers 需 user_id + question_id
router.post('/table/:name/row/delete', async (req, res) => {
  const name = req.params.name;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  const body = req.body || {};
  if (name === 'soul_answers') {
    const userId = body.user_id != null ? Number(body.user_id) : null;
    const questionId = body.question_id != null ? Number(body.question_id) : null;
    if (userId == null || questionId == null) return res.status(400).json({ error: 'Missing user_id and question_id' });
    try {
      await db.prepare('DELETE FROM soul_answers WHERE user_id = ? AND question_id = ?').run(userId, questionId);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  const pk = PK_COL[name];
  const id = body[pk];
  if (id == null) return res.status(400).json({ error: `Missing ${pk}` });
  try {
    await db.prepare(`DELETE FROM ${name} WHERE ${pk} = ?`).run(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
