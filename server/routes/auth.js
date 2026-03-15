import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

const EMAIL_SUFFIX = '@mpu.edu.mo';
const VERIFY_EXPIRE_MS = 24 * 60 * 60 * 1000;

// 发送邮箱验证（占位：需配置 SMTP 或 Resend 后真正发信，当前仅写库并打印链接便于开发）
router.post('/send-verification', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !email.endsWith(EMAIL_SUFFIX)) {
    return res.status(400).json({ error: '请填写有效的 @mpu.edu.mo 邮箱' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFY_EXPIRE_MS).toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)
  `).run(email, token, expiresAt);
  const link = `${req.protocol}://${req.get('host')}/verify-email?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[邮箱验证] 链接（开发用）:', link);
  }
  res.json({ ok: true, message: '验证邮件已发送（开发环境下请查看控制台链接）' });
});

// 验证邮箱 token，返回可用来完成注册的临时凭证（占位：前端可用此 token 在注册时带上以完成认证）
router.get('/verify-email', (req, res) => {
  const token = req.query?.token;
  if (!token) {
    return res.status(400).json({ error: '缺少 token' });
  }
  const row = db.prepare('SELECT email, expires_at FROM email_verifications WHERE token = ?').get(token);
  if (!row) {
    return res.status(400).json({ error: '链接无效或已失效' });
  }
  if (new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: '链接已过期，请重新获取' });
  }
  res.json({ ok: true, email: row.email, verifiedToken: token });
});

router.post('/register', (req, res) => {
  const { email, nickname, password } = req.body || {};
  if (!email || !nickname || !password) {
    return res.status(400).json({ error: '请填写邮箱、昵称和密码' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedEmail.endsWith(EMAIL_SUFFIX)) {
    return res.status(400).json({ error: '邮箱须为 @mpu.edu.mo 结尾', code: 'EMAIL_SUFFIX' });
  }
  const trimmedNickname = String(nickname).trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR nickname = ?').get(trimmedEmail, trimmedNickname);
  if (existing) {
    const isEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    return res.status(400).json({
      error: isEmail ? '该邮箱已注册' : '该昵称已被使用',
      code: isEmail ? 'EMAIL_EXISTS' : 'NICKNAME_EXISTS',
    });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, nickname, password_hash) VALUES (?, ?, ?)').run(trimmedEmail, trimmedNickname, password_hash);
  const userId = result.lastInsertRowid;
  const token = signToken(userId);
  res.json({ token, userId, email: trimmedEmail, nickname: trimmedNickname, needOnboarding: true });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT id, nickname, password_hash FROM users WHERE email = ?').get(trimmedEmail);
  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  const profile = db.prepare('SELECT user_id FROM profiles WHERE user_id = ?').get(user.id);
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
