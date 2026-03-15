import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

// 邮箱校验：仅允许 P（忽略大小写）+ 7 位数字 + @mpu.edu.mo，无验证码、不发邮件
const EMAIL_REGEX = /^p\d{7}@mpu\.edu\.mo$/i;
function isSchoolEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim().toLowerCase());
}

// 注册：仅邮箱 + 昵称 + 密码
router.post('/register', async (req, res) => {
  const { email, nickname, password } = req.body || {};
  if (!email || !nickname || !password) {
    return res.status(400).json({ error: '请填写邮箱、昵称和密码' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!isSchoolEmail(trimmedEmail)) {
    return res.status(400).json({ error: '为打造更好的交流环境，请填写真实的邮箱', code: 'EMAIL_INVALID' });
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
    return res.status(401).json({ error: '为打造更好的交流环境，请填写真实的邮箱' });
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

export default router;
