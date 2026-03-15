import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

// 邮箱校验：仅允许 P（忽略大小写）+ 7 位数字 + @mpu.edu.mo
const EMAIL_REGEX = /^p\d{7}@mpu\.edu\.mo$/i;
function isSchoolEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim().toLowerCase());
}
const LOGIN_CODE_EXPIRE_MS = 5 * 60 * 1000; // 5 分钟

// 注册：仅邮箱 + 昵称 + 密码；邮箱须为 P（忽略大小写）+ 7 位数字 + @mpu.edu.mo
router.post('/register', async (req, res) => {
  const { email, nickname, password } = req.body || {};
  if (!email || !nickname || !password) {
    return res.status(400).json({ error: '请填写邮箱、昵称和密码' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!isSchoolEmail(trimmedEmail)) {
    return res.status(400).json({ error: '邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo', code: 'EMAIL_INVALID' });
  }
  const trimmedNickname = String(nickname).trim();
  const existing = await db.prepare('SELECT id FROM users WHERE email = ? OR nickname = ?').get(trimmedEmail, trimmedNickname);
  if (existing) {
    const isEmail = await db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    return res.status(400).json({
      error: isEmail ? '该邮箱已注册' : '该昵称已被使用',
      code: isEmail ? 'EMAIL_EXISTS' : 'NICKNAME_EXISTS',
    });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const result = await db.prepare('INSERT INTO users (email, nickname, password_hash) VALUES (?, ?, ?)').run(trimmedEmail, trimmedNickname, password_hash);
  const userId = result.lastInsertRowid;
  const token = signToken(userId);
  res.json({ token, userId, email: trimmedEmail, nickname: trimmedNickname, needOnboarding: true });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!isSchoolEmail(trimmedEmail)) {
    return res.status(401).json({ error: '邮箱格式无效，须为 P + 7 位数字 + @mpu.edu.mo' });
  }
  const user = await db.prepare('SELECT id, nickname, password_hash FROM users WHERE email = ?').get(trimmedEmail);
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  const profile = await db.prepare('SELECT user_id FROM profiles WHERE user_id = ?').get(user.id);
  const token = signToken(user.id);
  res.json({
    token,
    userId: user.id,
    email: trimmedEmail,
    nickname: user.nickname,
    needOnboarding: !profile,
  });
});

// 发送登录验证码（4 位数字，5 分钟有效）
router.post('/send-login-code', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!isSchoolEmail(email)) {
    return res.status(400).json({ error: '邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo' });
  }
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(400).json({ error: '该邮箱尚未注册，请先注册' });
  }
  const code = String(crypto.randomInt(1000, 10000));
  const expiresAt = new Date(Date.now() + LOGIN_CODE_EXPIRE_MS).toISOString();
  await db.prepare('DELETE FROM login_codes WHERE email = ?').run(email);
  await db.prepare('INSERT INTO login_codes (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);
  res.json({ ok: true, message: '请使用下方验证码登录', devCode: code });
});

// 验证码登录
router.post('/login-with-code', async (req, res) => {
  const { email, code } = req.body || {};
  const trimmedEmail = String(email || '').trim().toLowerCase();
  const codeStr = String(code || '').trim();
  if (!trimmedEmail || !codeStr) {
    return res.status(400).json({ error: '请填写邮箱和验证码' });
  }
  if (!isSchoolEmail(trimmedEmail)) {
    return res.status(401).json({ error: '邮箱格式无效，须为 P + 7 位数字 + @mpu.edu.mo' });
  }
  const row = await db.prepare('SELECT code, expires_at FROM login_codes WHERE email = ?').get(trimmedEmail);
  if (!row) {
    return res.status(401).json({ error: '验证码无效或已过期，请重新获取' });
  }
  if (new Date(row.expires_at) < new Date()) {
    await db.prepare('DELETE FROM login_codes WHERE email = ?').run(trimmedEmail);
    return res.status(401).json({ error: '验证码已过期，请重新获取' });
  }
  if (row.code !== codeStr) {
    return res.status(401).json({ error: '验证码错误' });
  }
  const user = await db.prepare('SELECT id, nickname FROM users WHERE email = ?').get(trimmedEmail);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  await db.prepare('DELETE FROM login_codes WHERE email = ?').run(trimmedEmail);
  const profile = await db.prepare('SELECT user_id FROM profiles WHERE user_id = ?').get(user.id);
  const token = signToken(user.id);
  res.json({
    token,
    userId: user.id,
    email: trimmedEmail,
    nickname: user.nickname,
    needOnboarding: !profile,
  });
});

export default router;
