import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { signToken } from '../middleware/auth.js';
import { sendLoginCodeEmail, sendRegisterCodeEmail } from '../resend.js';

const router = Router();

const EMAIL_SUFFIX = '@mpu.edu.mo';
const EMAIL_REGEX = /^p\d{7}@mpu\.edu\.mo$/i;
function isSchoolEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim().toLowerCase());
}
const VERIFY_EXPIRE_MS = 24 * 60 * 60 * 1000;
const LOGIN_CODE_EXPIRE_MS = 5 * 60 * 1000; // 5 分钟
const REGISTER_CODE_EXPIRE_MS = 5 * 60 * 1000; // 5 分钟

// 发送邮箱验证（占位：需配置 SMTP 或 Resend 后真正发信，当前仅写库并打印链接便于开发）
router.post('/send-verification', async (req, res) => {
  const em = String(req.body?.email || '').trim().toLowerCase();
  if (!isSchoolEmail(em)) {
    return res.status(400).json({ error: '邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo' });
  }
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(em);
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFY_EXPIRE_MS).toISOString();
  await db.prepare('DELETE FROM email_verifications WHERE email = ?').run(em);
  await db.prepare('INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)').run(em, token, expiresAt);
  const link = `${req.protocol}://${req.get('host')}/verify-email?token=${token}`;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[邮箱验证] 链接（开发用）:', link);
  }
  res.json({ ok: true, message: '验证邮件已发送（开发环境下请查看控制台链接）' });
});

// 验证邮箱 token（链接验证用）
router.get('/verify-email', async (req, res) => {
  const token = req.query?.token;
  if (!token) {
    return res.status(400).json({ error: '缺少 token' });
  }
  const row = await db.prepare('SELECT email, expires_at FROM email_verifications WHERE token = ?').get(token);
  if (!row) {
    return res.status(400).json({ error: '链接无效或已失效' });
  }
  if (new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: '链接已过期，请重新获取' });
  }
  res.json({ ok: true, email: row.email, verifiedToken: token });
});

// 发送注册验证码（4 位数字，5 分钟有效，仅限未注册邮箱）
router.post('/send-register-code', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!isSchoolEmail(email)) {
    return res.status(400).json({ error: '邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo' });
  }
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册，请直接登录' });
  }
  const code = String(crypto.randomInt(1000, 10000));
  const expiresAt = new Date(Date.now() + REGISTER_CODE_EXPIRE_MS).toISOString();
  await db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
  await db.prepare('INSERT INTO email_verifications (email, token, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);
  const result = await sendRegisterCodeEmail(email, code);
  const payload = {
    ok: true,
    message: result.ok ? '验证码已发送到你的邮箱，5 分钟内有效' : '验证码已生成（邮件未发送，请使用下方验证码）',
  };
  if (!result.ok) {
    payload.devCode = code;
    if (result.error) payload.emailError = result.error;
  } else if (process.env.NODE_ENV !== 'production') payload.devCode = code;
  res.json(payload);
});

router.post('/register', async (req, res) => {
  const { email, nickname, password, code } = req.body || {};
  if (!email || !nickname || !password) {
    return res.status(400).json({ error: '请填写邮箱、昵称和密码' });
  }
  const codeStr = String(code ?? '').trim();
  if (!codeStr) {
    return res.status(400).json({ error: '请填写邮箱验证码', code: 'CODE_REQUIRED' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!isSchoolEmail(trimmedEmail)) {
    return res.status(400).json({ error: '邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo', code: 'EMAIL_INVALID' });
  }
  const row = await db.prepare('SELECT token, expires_at FROM email_verifications WHERE email = ?').get(trimmedEmail);
  if (!row) {
    return res.status(400).json({ error: '请先获取邮箱验证码', code: 'CODE_INVALID' });
  }
  if (new Date(row.expires_at) < new Date()) {
    await db.prepare('DELETE FROM email_verifications WHERE email = ?').run(trimmedEmail);
    return res.status(400).json({ error: '验证码已过期，请重新获取', code: 'CODE_EXPIRED' });
  }
  if (row.token !== codeStr) {
    return res.status(400).json({ error: '验证码错误', code: 'CODE_WRONG' });
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
  await db.prepare('DELETE FROM email_verifications WHERE email = ?').run(trimmedEmail);
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
  const result = await sendLoginCodeEmail(email, code);
  const payload = {
    ok: true,
    message: result.ok ? '验证码已发送到你的邮箱，5 分钟内有效' : '验证码已生成（邮件未发送，请使用下方验证码）',
  };
  if (!result.ok) {
    payload.devCode = code;
    if (result.error) payload.emailError = result.error;
  } else if (process.env.NODE_ENV !== 'production') payload.devCode = code;
  res.json(payload);
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
