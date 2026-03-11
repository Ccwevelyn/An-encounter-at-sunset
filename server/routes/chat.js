import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();
router.use(authMiddleware);

function getMatchId(userId, partnerId) {
  const a = Math.min(userId, partnerId);
  const b = Math.max(userId, partnerId);
  const row = db.prepare('SELECT id FROM matches WHERE user_a = ? AND user_b = ?').get(a, b);
  return row?.id ?? null;
}

router.get('/:partnerId', (req, res) => {
  const partnerId = parseInt(req.params.partnerId, 10);
  const matchId = getMatchId(req.userId, partnerId);
  if (!matchId) {
    return res.status(404).json({ error: '未与该用户匹配' });
  }
  const messages = db.prepare(`
    SELECT id, match_id, sender_id, content, created_at
    FROM messages WHERE match_id = ?
    ORDER BY created_at ASC
  `).all(matchId);
  res.json({ messages });
});

router.post('/:partnerId', (req, res) => {
  const partnerId = parseInt(req.params.partnerId, 10);
  const { content } = req.body || {};
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }
  const matchId = getMatchId(req.userId, partnerId);
  if (!matchId) {
    return res.status(404).json({ error: '未与该用户匹配' });
  }
  db.prepare('INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)').run(matchId, req.userId, String(content).trim());
  const row = db.prepare('SELECT id, match_id, sender_id, content, created_at FROM messages ORDER BY id DESC LIMIT 1').get();
  res.json({ message: row });
});

export default router;
