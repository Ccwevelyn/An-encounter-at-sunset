import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { callDeepSeek } from '../deepseek.js';

const router = Router();
router.use(authMiddleware);

const BOT_IDS = [0, 1, 2];
const BOT_NAMES = { 0: '最伟大最尊敬的导师', 1: '看不上你对象的朋友', 2: '知心姐姐' };

/** 单条回复最大字数（约半屏），超出则分条或截断并引导 */
const MAX_REPLY_CHARS = 80;

const BOT_SYSTEMS = {
  0: `你是最伟大、最令人尊敬的导师。用中文回复，语气庄严、智慧深邃，善于点拨与引领，让人豁然开朗。你能从对方的话里引出更高一层的思考、拓展视野，像明灯一样照见前路，但从不居高临下说教。
重要：单条回复严格控制在${MAX_REPLY_CHARS}字以内（约半屏）。若需展开，先给一句精炼的点拨，结尾可引导用户追问（如「想听更多可以接着问」），不要一次写很长。`,
  1: `你是用户的朋友，但你看不上他/她的对象，总觉得对方配不上、有问题。用中文回复，直接、毒舌、爱吐槽用户的另一半，经常泼冷水、挑刺（比如嫌对方不够好、不靠谱、配不上你朋友），但本质是关心用户、怕 ta 吃亏。
重要：单条回复控制在${MAX_REPLY_CHARS}字以内，简短有力。若想多说，分多条发或结尾说「还有想吐槽的，你接着问」。`,
  2: `你是一位温柔和蔼的知心大姐姐。用中文回复，语气温暖、包容、善解人意，让人愿意倾诉。可以共情、安慰、给建议，但不要说教。
重要：单条回复控制在${MAX_REPLY_CHARS}字以内（约半屏）。若需展开，先给一句温暖回应，结尾可引导用户继续问（如「想听更多可以慢慢说」），不要一次写很长。`,
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

/**
 * 将过长回复按句号/问号/感叹号/换行拆成多条，每条不超过 maxLen 字。
 * 优先在句末断句，否则在 maxLen 处截断并加省略。
 */
function splitReplyIntoChunks(text, maxLen = MAX_REPLY_CHARS) {
  if (!text || text.length <= maxLen) return text ? [text] : [];
  const chunks = [];
  let rest = text.trim();
  while (rest.length > maxLen) {
    const slice = rest.slice(0, maxLen);
    let breakAt = maxLen;
    for (let i = slice.length - 1; i >= Math.floor(maxLen * 0.4); i--) {
      if (/[。！？\n]/.test(slice[i])) {
        breakAt = i + 1;
        break;
      }
    }
    chunks.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.length ? chunks : [text.slice(0, maxLen - 2) + '…'];
}

function storeKey(userId, partnerId) {
  return `${userId}-${partnerId}`;
}

const botChatStore = new Map();

/**
 * 获取 bot 回复，可能返回一条或多条（多条时为数组，每条控制在半屏内）。
 */
async function getBotReply(partnerId, userMessage) {
  const pid = Number(partnerId);
  const system = BOT_SYSTEMS[pid];
  const text = String(userMessage).trim();
  const ai = await callDeepSeek(
    [
      { role: 'system', content: system },
      { role: 'user', content: text || '（用户没打字）' },
    ],
    { max_tokens: 100, temperature: pid === 1 ? 0.8 : 0.6 }
  );
  const raw = ai || getBotFallback(pid, userMessage);
  const chunks = splitReplyIntoChunks(raw, MAX_REPLY_CHARS);
  return chunks.length === 1 ? chunks[0] : chunks;
}

async function getMatchId(userId, partnerId) {
  const a = Math.min(userId, partnerId);
  const b = Math.max(userId, partnerId);
  const row = await db.prepare('SELECT id FROM matches WHERE user_a = ? AND user_b = ?').get(a, b);
  return row?.id ?? null;
}

// 导师（partnerId 0）首次打开时的默认第一句，必须为此句
const BOT_FIRST_MSG = {
  0: { id: 0, match_id: 0, sender_id: 0, content: 'hello,我是王哥', created_at: new Date().toISOString() },
};

function addIsMine(messages, currentUserId) {
  const uid = Number(currentUserId);
  return (messages || []).map((m) => {
    const sid = m.sender_id != null ? Number(m.sender_id) : null;
    const isMine = uid > 0 && sid === uid;
    return { ...m, sender_id: sid, isMine };
  });
}

router.get('/:partnerId', async (req, res) => {
  const partnerId = parseInt(req.params.partnerId, 10);
  const currentUserId = req.userId != null ? Number(req.userId) : null;
  if (isBot(partnerId)) {
    const key = storeKey(req.userId, partnerId);
    const list = botChatStore.get(key)?.messages ?? [];
    if (partnerId === 0 && list.length === 0) {
      const messages = addIsMine([BOT_FIRST_MSG[0]], currentUserId);
      return res.json({ messages, currentUserId });
    }
    const messages = addIsMine(list, currentUserId);
    return res.json({ messages, currentUserId });
  }
  const matchId = await getMatchId(req.userId, partnerId);
  if (!matchId) {
    return res.status(404).json({ error: '未与该用户匹配' });
  }
  const rows = await db.prepare(`
    SELECT id, match_id, sender_id, content, created_at
    FROM messages WHERE match_id = ?
    ORDER BY created_at ASC
  `).all(matchId);
  const messages = addIsMine(rows, currentUserId);
  res.json({ messages, currentUserId });
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
    const uid = Number(req.userId);
    const pid = Number(partnerId);
    const userMsg = { id: store.messages.length + 1, match_id: 0, sender_id: uid, content: String(content).trim(), created_at: now, isMine: true };
    store.messages.push(userMsg);
    const botReply = await getBotReply(partnerId, content);
    const botContents = Array.isArray(botReply) ? botReply : [botReply];
    const botMessages = botContents.map((c) => {
      const botMsg = { id: store.messages.length + 1, match_id: 0, sender_id: pid, content: String(c).trim(), created_at: now, isMine: false };
      store.messages.push(botMsg);
      return botMsg;
    });
    return res.json({ message: userMsg, botMessages, currentUserId: Number(req.userId) });
  }
  const matchId = await getMatchId(req.userId, partnerId);
  if (!matchId) {
    return res.status(404).json({ error: '未与该用户匹配' });
  }
  const result = await db.prepare('INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)').run(matchId, req.userId, String(content).trim());
  const row = await db.prepare('SELECT id, match_id, sender_id, content, created_at FROM messages WHERE id = ?').get(result.lastInsertRowid);
  const msg = row ? { ...row, sender_id: Number(row.sender_id), isMine: true } : row;
  res.json({ message: msg, currentUserId: Number(req.userId) });
});

export default router;
