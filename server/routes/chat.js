import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { callDeepSeek } from '../deepseek.js';

const router = Router();
router.use(authMiddleware);

const BOT_IDS = [0, 1, 2];
const BOT_NAMES = { 0: '最伟大最尊敬的导师', 1: '看不上你对象的朋友', 2: '知心姐姐' };

const BOT_SYSTEMS = {
  0: `你是最伟大、最令人尊敬的导师。用中文回复，语气庄严、智慧深邃，善于点拨与引领，让人豁然开朗。你能从对方的话里引出更高一层的思考、拓展视野，像明灯一样照见前路，但从不居高临下说教。回复有分量，一两段即可。`,
  1: `你是用户的朋友，但你看不上他/她的对象，总觉得对方配不上、有问题。用中文回复，直接、毒舌、爱吐槽用户的另一半，经常泼冷水、挑刺（比如嫌对方不够好、不靠谱、配不上你朋友），但本质是关心用户、怕 ta 吃亏。简短有力，一两句就行。`,
  2: `你是一位温柔和蔼的知心大姐姐。用中文回复，语气温暖、包容、善解人意，让人愿意倾诉。可以共情、安慰、给建议，但不要说教。回复适中，一两段即可。`,
};

function getBotFallback(partnerId, userMessage) {
  const t = String(userMessage).trim().toLowerCase();
  if (!t) {
    return { 0: '再往深处想一步。', 1: '你对象呢？说说。', 2: '没事，慢慢说。' }[partnerId];
  }
  if (partnerId === 0) {
    if (t.includes('？') || t.includes('?')) return '这个问题，值得你再想深一层。';
    if (t.length <= 4) return '嗯，问得好。';
    return '再往深处想一步。';
  }
  if (partnerId === 1) {
    if (t.includes('你好') || t.includes('在吗')) return '在，你对象最近咋样？';
    if (t.length <= 2) return '就这？你对象呢？';
    if (t.includes('谢谢')) return '谢啥，别被忽悠就行。';
    return '反正我瞧不上 ta，你多留个心眼。';
  }
  if (partnerId === 2) {
    if (t.includes('你好') || t.includes('在吗')) return '在的，你说。';
    if (t.length <= 2) return '嗯，然后呢？';
    if (t.includes('谢谢')) return '不客气，有事随时说。';
    return '我在听。';
  }
  return '嗯。';
}

function isBot(partnerId) {
  return BOT_IDS.includes(Number(partnerId));
}

function storeKey(userId, partnerId) {
  return `${userId}-${partnerId}`;
}

const botChatStore = new Map();

async function getBotReply(partnerId, userMessage) {
  const pid = Number(partnerId);
  const system = BOT_SYSTEMS[pid];
  const text = String(userMessage).trim();
  const ai = await callDeepSeek(
    [
      { role: 'system', content: system },
      { role: 'user', content: text || '（用户没打字）' },
    ],
    { max_tokens: pid === 0 ? 150 : 80, temperature: pid === 1 ? 0.8 : 0.6 }
  );
  if (ai) return ai;
  return getBotFallback(pid, userMessage);
}

async function getMatchId(userId, partnerId) {
  const a = Math.min(userId, partnerId);
  const b = Math.max(userId, partnerId);
  const row = await db.prepare('SELECT id FROM matches WHERE user_a = ? AND user_b = ?').get(a, b);
  return row?.id ?? null;
}

router.get('/:partnerId', async (req, res) => {
  const partnerId = parseInt(req.params.partnerId, 10);
  if (isBot(partnerId)) {
    const key = storeKey(req.userId, partnerId);
    const list = botChatStore.get(key)?.messages ?? [];
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
  if (isBot(partnerId)) {
    const key = storeKey(req.userId, partnerId);
    if (!botChatStore.has(key)) botChatStore.set(key, { messages: [] });
    const store = botChatStore.get(key);
    const now = new Date().toISOString();
    const userMsg = { id: store.messages.length + 1, match_id: 0, sender_id: req.userId, content: String(content).trim(), created_at: now };
    store.messages.push(userMsg);
    const botContent = await getBotReply(partnerId, content);
    const botMsg = { id: store.messages.length + 1, match_id: 0, sender_id: partnerId, content: botContent, created_at: now };
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
