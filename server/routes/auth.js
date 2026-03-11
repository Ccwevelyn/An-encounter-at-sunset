import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

const EMAIL_SUFFIX = '@mpu.edu.mo';

router.post('/register', (req, res) => {
  const { email, nickname, password } = req.body || {};
  if (!email || !nickname || !password) {
    return res.status(400).json({ error: '请填写邮箱、昵称和密码' });
  }
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedEmail.endsWith(EMAIL_SUFFIX)) {
    return res.status(400).json({ error: '等待远方的邂逅', code: 'EMAIL_SUFFIX' });
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
