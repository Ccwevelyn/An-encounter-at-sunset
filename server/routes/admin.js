/**
 * 简易数据库管理 API：仅当设置了 ADMIN_SECRET 且请求带正确 secret 时可用。
 * 用于在 Render 等部署环境下通过浏览器查看/编辑 SQLite 数据。
 */
import { Router } from 'express';
import db from '../db.js';

const router = Router();
const ALLOWED_TABLES = ['users', 'profiles', 'matches', 'messages'];
const PK_COL = { users: 'id', profiles: 'user_id', matches: 'id', messages: 'id' };

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
  next();
});

// 表列表
router.get('/tables', (req, res) => {
  res.json({ tables: ALLOWED_TABLES });
});

// 表结构 + 数据
router.get('/table/:name', (req, res) => {
  const name = req.params.name;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  try {
    const columns = db.prepare(`PRAGMA table_info(${name})`).all();
    const rows = db.prepare(`SELECT * FROM ${name}`).all();
    res.json({ columns: columns.map((c) => ({ name: c.name, type: c.type })), rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新一行（body: { id 或 user_id, ...fields }）
router.post('/table/:name/row', (req, res) => {
  const name = req.params.name;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  const pk = PK_COL[name];
  const body = req.body || {};
  const id = body[pk];
  if (id == null) {
    return res.status(400).json({ error: `Missing ${pk}` });
  }
  const columns = db.prepare(`PRAGMA table_info(${name})`).all();
  const colNames = columns.map((c) => c.name).filter((n) => n !== pk);
  const updates = [];
  const values = [];
  for (const col of colNames) {
    if (col in body) {
      updates.push(`${col} = ?`);
      values.push(body[col]);
    }
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  values.push(id);
  try {
    db.prepare(`UPDATE ${name} SET ${updates.join(', ')} WHERE ${pk} = ?`).run(...values);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 删除一行（body: { id 或 user_id }）
router.post('/table/:name/row/delete', (req, res) => {
  const name = req.params.name;
  if (!ALLOWED_TABLES.includes(name)) {
    return res.status(400).json({ error: 'Invalid table' });
  }
  const pk = PK_COL[name];
  const id = req.body?.[pk];
  if (id == null) {
    return res.status(400).json({ error: `Missing ${pk}` });
  }
  try {
    db.prepare(`DELETE FROM ${name} WHERE ${pk} = ?`).run(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
