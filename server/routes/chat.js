import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { callDeepSeek } from '../deepseek.js';

const router = Router();
router.use(authMiddleware);

const TEST_PARTNER_ID = 0;
const testChatStore = new Map();

const BOT_SYSTEM = `你是「Test」，一个恋爱匹配小站的机器人。回复要求：用中文、简短（一两句）、直接、口语化，像朋友闲聊。不要长篇大论，不要重复用户原话。`;

function getTestBotReplyFallback(userMessage) {
  const t = String(userMessage).trim().toLowerCase();
  if (!t) return '嗯，你说。';
  if (t.includes('你好') || t.includes('hi') || t.includes('在吗')) return '在的，你说。';
  if (t.includes('谁') && (t.includes('你') || t.includes('吗'))) return '我是 Test，这个站的作者做的机器人，随便聊聊。';
  if (t.includes('谢谢') || t.includes('感谢')) return '不客气。';
  if (t.length <= 2) return '嗯嗯。';
  if (t.includes('？') || t.includes('?')) return '这个得你自己想啦。';
  return '有意思，然后呢？';
}

async function getTestBotReply(userMessage) {
  const text = String(userMessage).trim();
  const ai = await callDeepSeek(
    [
      { role: 'system', content: BOT_SYSTEM },
      { role: 'user', content: text || '（用户没打字）' },
    ],
    { max_tokens: 80, temperature: 0.6 }
  );
  if (ai) return ai;
  return getTestBotReplyFallback(userMessage);
}

async function getMatchId(userId, partnerId) {
  const a = Math.min(userId, partnerId);
  const b = Math.max(userId, partnerId);
  const row = await db.prepare('SELECT id FROM matches WHERE user_a = ? AND user_b = ?').get(a, b);
  return row?.id ?? null;
}

router.get('/:partnerId', async (req, res) => {
  const partnerId = parseInt(req.params.partnerId, 10);
  if (partnerId === TEST_PARTNER_ID) {
    const list = testChatStore.get(req.userId)?.messages ?? [];
    return res.json({ messages: list });
  }
  const matchId = await getMatchId(req.userId, partnerId);
  if (!matchId) {
    return res.status(404).json({ error: '未与该用户匹配' });
  }
  const messages = await db.prepare(`
    SELECT id, match_id, sender_id, content, created_at
    FROM messages WHERE match_id = ?
    ORDER BY created_at ASC
  `).all(matchId);
  res.json({ messages });
});

router.post('/:partnerId', async (req, res) => {
  const partnerId = parseInt(req.params.partnerId, 10);
  const { content } = req.body || {};
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }
  if (partnerId === TEST_PARTNER_ID) {
    if (!testChatStore.has(req.userId)) testChatStore.set(req.userId, { messages: [] });
    const store = testChatStore.get(req.userId);
    const now = new Date().toISOString();
    const userMsg = { id: store.messages.length + 1, match_id: 0, sender_id: req.userId, content: String(content).trim(), created_at: now };
    store.messages.push(userMsg);
    const botContent = await getTestBotReply(content);
    const botMsg = { id: store.messages.length + 1, match_id: 0, sender_id: TEST_PARTNER_ID, content: botContent, created_at: now };
    store.messages.push(botMsg);
    return res.json({ message: userMsg, botMessage: botMsg });
  }
  const matchId = await getMatchId(req.userId, partnerId);
  if (!matchId) {
    return res.status(404).json({ error: '未与该用户匹配' });
  }
  await db.prepare('INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)').run(matchId, req.userId, String(content).trim());
  const row = await db.prepare('SELECT id, match_id, sender_id, content, created_at FROM messages ORDER BY id DESC LIMIT 1').get();
  res.json({ message: row });
});

export default router;
