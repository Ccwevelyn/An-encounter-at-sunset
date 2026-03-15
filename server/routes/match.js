import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
import { callDeepSeek } from '../deepseek.js';

const router = Router();
router.use(authMiddleware);

// MBTI 配对友好度（简化：同类型或经典配对加分）
const MBTI_COMPAT = {
  INFP: ['ENFJ', 'ENTJ', 'ENFP'],
  ENFP: ['INFJ', 'INTJ', 'INFP'],
  INFJ: ['ENFP', 'ENTP', 'INFP'],
  ENFJ: ['INFP', 'INTP', 'ENFP'],
  INTJ: ['ENFP', 'ENFJ', 'ENTP'],
  ENTJ: ['INFP', 'INTP', 'INFP'],
  INTP: ['ENTJ', 'ENFJ', 'ENFP'],
  ENTP: ['INFJ', 'INTJ', 'INFP'],
  ISFP: ['ESFJ', 'ESTJ', 'ENFJ'],
  ESFP: ['ISFJ', 'ISTJ', 'ISFP'],
  ISFJ: ['ESTP', 'ESFP', 'ESTJ'],
  ESFJ: ['ISFP', 'ISTP', 'ISFJ'],
  ISTJ: ['ESFP', 'ESFJ', 'ESTP'],
  ESTJ: ['ISFP', 'ISFJ', 'ISTJ'],
  ISTP: ['ESTJ', 'ESFJ', 'ESFP'],
  ESTP: ['ISFJ', 'ISTJ', 'ISTP'],
};

function parseCities(cities) {
  if (Array.isArray(cities)) return cities;
  if (typeof cities === 'string') {
    try {
      return JSON.parse(cities) || [];
    } catch {
      return [];
    }
  }
  return [];
}

function loveIndexScore(a, b) {
  const ai = a?.love_index != null ? a.love_index : 0;
  const bi = b?.love_index != null ? b.love_index : 0;
  return Math.abs(ai - bi);
}

const RELATIONSHIP_ORDER = ['0段', '半段', '1段', '2段', '3段及以上'];
function relationshipDiff(a, b) {
  const i = RELATIONSHIP_ORDER.indexOf(a?.relationship_count || '');
  const j = RELATIONSHIP_ORDER.indexOf(b?.relationship_count || '');
  if (i < 0 || j < 0) return 999;
  return Math.abs(i - j);
}

const LONGEST_RELATIONSHIP_ORDER = ['<1个月', '1-3月', '3-6月', '1年', '2年', '3年', '>3年', '>5年'];
function longestRelationshipDiff(a, b) {
  const i = LONGEST_RELATIONSHIP_ORDER.indexOf(a?.longest_relationship || '');
  const j = LONGEST_RELATIONSHIP_ORDER.indexOf(b?.longest_relationship || '');
  if (i < 0 || j < 0) return 999;
  return Math.abs(i - j);
}

// 月花销等级 A=0, B=1, C=2, D=3, E=4
function budgetLevel(budget) {
  const s = String(budget || '').trim();
  const letter = s[0] || s;
  const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
  return map[letter.toUpperCase()] ?? -1;
}

function canMatchByCity(me, other) {
  const myCities = parseCities(me.cities);
  const otherCities = parseCities(other.cities);
  if (myCities.length === 0 || otherCities.length === 0) return false;
  return myCities.some(c => otherCities.includes(c));
}

function cityTier(budget) {
  const s = String(budget || '').trim();
  const letter = (s[0] || '').toUpperCase();
  if (['A','B','C','D','E'].includes(letter)) return letter;
  const level = budgetLevel(budget);
  if (level <= 0) return 'A';
  if (level <= 1) return 'B';
  if (level <= 2) return 'C';
  if (level <= 3) return 'D';
  return 'E';
}

function canMatchByBudgetTier(myTier, otherTier) {
  const tiers = ['A', 'B', 'C', 'D', 'E'];
  const myIdx = tiers.indexOf(myTier);
  const otherIdx = tiers.indexOf(otherTier);
  if (myIdx <= 0) return ['A', 'B'].includes(otherTier);
  if (myIdx <= 1) return ['A', 'B', 'C'].includes(otherTier);
  if (myIdx <= 2) return ['B', 'C', 'D'].includes(otherTier);
  if (myIdx <= 3) return ['C', 'D', 'E'].includes(otherTier);
  return ['D', 'E'].includes(otherTier);
}

// 希望匹配的性别：只有双方都接受对方性别时才可匹配
function acceptsGender(preferred, otherGender) {
  if (!otherGender) return false;
  if (preferred === '不限') return true;
  return preferred === otherGender;
}

// 随机匹配：可选择是否开启随机匹配状态，开启后即可被匹配；双向性别过滤，再随机一人
router.post('/random/join', async (req, res) => {
  const myProfile = await db.prepare('SELECT random_mode_enabled, gender, preferred_gender FROM profiles WHERE user_id = ?').get(req.userId);
  if (!myProfile) {
    return res.status(400).json({ error: '请先完善个人资料' });
  }
  const now = new Date().toISOString();
  await db.prepare('UPDATE profiles SET random_mode_enabled = 1, random_mode_ts = ? WHERE user_id = ?').run(now, req.userId);

  const all = await db.prepare(`
    SELECT p.user_id, p.gender, p.preferred_gender
    FROM profiles p
    WHERE p.user_id != ? AND p.random_mode_enabled = 1
  `).all(req.userId);

  const candidates = all.filter(row =>
    acceptsGender(myProfile.preferred_gender, row.gender) && acceptsGender(row.preferred_gender, myProfile.gender)
  );

  if (candidates.length === 0) {
    return res.json({ matched: false, message: '暂无开启随机匹配且符合性别偏好的用户，请稍后再试或邀请更多朋友使用' });
  }

  const partner = candidates[Math.floor(Math.random() * candidates.length)];
  const userA = Math.min(req.userId, partner.user_id);
  const userB = Math.max(req.userId, partner.user_id);
  try {
    await db.prepare('INSERT INTO matches (user_a, user_b, mode) VALUES (?, ?, ?)').run(userA, userB, 'random');
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT' || e.code === '23505') {
      return res.json({ matched: true, partnerId: partner.user_id, existing: true });
    }
    throw e;
  }
  return res.json({ matched: true, partnerId: partner.user_id });
});

router.post('/fate', async (req, res) => {
  const myProfile = await db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  if (!myProfile) {
    return res.status(400).json({ error: '请先完善个人资料' });
  }

  const purpose = myProfile.purpose;
  const allProfiles = await db.prepare(`
    SELECT p.*, u.nickname
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id != ?
  `).all(req.userId);

  let candidates = allProfiles;

  // 只匹配希望匹配的性别：双方都要接受对方性别
  const myGender = myProfile.gender;
  const myPreferred = myProfile.preferred_gender;
  candidates = candidates.filter(p => acceptsGender(myPreferred, p.gender) && acceptsGender(p.preferred_gender, myGender));

  if (purpose === '专注当下的快乐') {
    candidates = candidates.filter(p => p.purpose === '专注当下的快乐');
  } else {
    // 走向未来的婚姻：城市需有交集，月花销档位匹配
    const myCities = parseCities(myProfile.cities);
    const myTier = cityTier(myProfile.monthly_budget);
    candidates = candidates.filter(p => {
      if (p.purpose === '专注当下的快乐') return false;
      if (!canMatchByCity(myProfile, p)) return false;
      return canMatchByBudgetTier(myTier, cityTier(p.monthly_budget));
    });
  }

  if (candidates.length === 0) {
    return res.status(200).json({
      matched: false,
      error: '缘分还在远方，或许可以邀请更多朋友使用本网页',
    });
  }

  // 想恋爱指数差值 <= 2，恋爱经历差值 <= 2
  candidates = candidates.filter(p => {
    if (loveIndexScore(myProfile, p) > 2) return false;
    if (relationshipDiff(myProfile, p) > 2) return false;
    return true;
  });

  if (candidates.length === 0) {
    return res.status(200).json({
      matched: false,
      error: '缘分还在远方，或许可以邀请更多朋友使用本网页',
    });
  }

  // 优先同学位
  const myDegree = myProfile.degree || '';
  const sameDegree = myDegree ? candidates.filter(p => (p.degree || '') === myDegree) : [];
  const degreePool = sameDegree.length > 0 ? sameDegree : candidates;

  // 优先最长恋爱时间相近（差值小）
  degreePool.sort((a, b) => {
    const diffA = longestRelationshipDiff(myProfile, a);
    const diffB = longestRelationshipDiff(myProfile, b);
    return diffA - diffB;
  });
  const closestLongest = degreePool.filter(p => longestRelationshipDiff(myProfile, p) <= 2);
  const relationshipPool = closestLongest.length > 0 ? closestLongest : degreePool;

  // MBTI 优先配对
  const myMbti = (myProfile.mbti || '').toUpperCase();
  const compatSet = myMbti ? (MBTI_COMPAT[myMbti] || []) : [];
  const withMbti = relationshipPool.filter(p => {
    const o = (p.mbti || '').toUpperCase();
    return o && (o === myMbti || compatSet.includes(o));
  });
  const pool = withMbti.length > 0 ? withMbti : relationshipPool;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const userA = Math.min(req.userId, chosen.user_id);
  const userB = Math.max(req.userId, chosen.user_id);
  try {
    await db.prepare('INSERT INTO matches (user_a, user_b, mode) VALUES (?, ?, ?)').run(userA, userB, 'fate');
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT' || e.code === '23505') {
      return res.json({ matched: true, partnerId: chosen.user_id, existing: true });
    }
    throw e;
  }
  return res.json({ matched: true, partnerId: chosen.user_id });
});

// 灵魂共鸣：3–5 道主观题，用户文字回答，后续可接 AI 分析匹配
router.get('/soul/questions', async (req, res) => {
  const rows = await db.prepare('SELECT id, question, sort_order FROM soul_questions ORDER BY sort_order, id').all();
  res.json({ questions: rows });
});

router.post('/soul/answers', async (req, res) => {
  try {
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: '请至少回答一题' });
    }
    let saved = 0;
    for (const a of answers) {
      const qId = a.questionId ?? a.question_id;
      const text = a.answer != null ? String(a.answer).trim() : '';
      if (!qId || text === '') continue;
      await db.prepare('DELETE FROM soul_answers WHERE user_id = ? AND question_id = ?').run(req.userId, qId);
      await db.prepare('INSERT INTO soul_answers (user_id, question_id, answer) VALUES (?, ?, ?)').run(req.userId, qId, text);
      saved += 1;
    }
    if (saved === 0) {
      return res.status(400).json({ error: '请至少回答一题' });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('[soul/answers]', e);
    return res.status(500).json({ error: e.message || '保存失败，请稍后重试' });
  }
});

router.post('/soul', async (req, res) => {
  const myProfile = await db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  if (!myProfile) {
    return res.status(400).json({ error: '请先完善个人资料' });
  }
  const mySoul = await db.prepare('SELECT 1 FROM soul_answers WHERE user_id = ? LIMIT 1').get(req.userId);
  if (!mySoul) {
    return res.status(400).json({ error: '请先填写主观题' });
  }
  const myGender = myProfile.gender;
  const myPreferred = myProfile.preferred_gender;
  const withSoulRows = await db.prepare(`
    SELECT DISTINCT user_id FROM soul_answers WHERE user_id != ?
  `).all(req.userId);
  const withSoul = withSoulRows.map(r => r.user_id);
  if (withSoul.length === 0) {
    return res.status(200).json({ matched: false, error: '暂无灵魂共鸣候选，先填写主观题或邀请更多人参与' });
  }
  const placeholders = withSoul.map(() => '?').join(',');
  let candidates = await db.prepare(`
    SELECT p.*, u.nickname FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id != ? AND p.user_id IN (${placeholders})
  `).all(req.userId, ...withSoul);
  candidates = candidates.filter(p => acceptsGender(myPreferred, p.gender) && acceptsGender(p.preferred_gender, myGender));
  if (candidates.length === 0) {
    return res.status(200).json({ matched: false, error: '暂无灵魂共鸣候选，先填写主观题或邀请更多人参与' });
  }

  const questions = await db.prepare('SELECT id, question, sort_order FROM soul_questions ORDER BY sort_order, id').all();
  const myAnswers = await db.prepare('SELECT question_id, answer FROM soul_answers WHERE user_id = ?').all(req.userId);
  const myMap = Object.fromEntries(myAnswers.map((r) => [r.question_id, r.answer || '']));

  function formatQA(answersMap) {
    return questions
      .map((q) => `Q${q.id}: ${q.question}\nA: ${answersMap[q.id] ?? '（未答）'}`)
      .join('\n\n');
  }

  let chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey && candidates.length > 0) {
    const cap = 15;
    const toRank = candidates.slice(0, cap);
    const myBlock = `【我的回答】\n${formatQA(myMap)}`;
    const blocks = await Promise.all(
      toRank.map(async (c) => {
        const rows = await db.prepare('SELECT question_id, answer FROM soul_answers WHERE user_id = ?').all(c.user_id);
        const cMap = Object.fromEntries(rows.map((r) => [r.question_id, r.answer || '']));
        return `【候选人 user_id=${c.user_id}】\n${formatQA(cMap)}`;
      })
    );
    const candidateBlocks = blocks.join('\n\n');
    const prompt = `你是一个恋爱观契合度助手。根据下列灵魂共鸣题的回答，对「我」与每位候选人的契合度从高到低排序。
仅输出一个 JSON 数组，为排序后的 user_id，例如 [7, 5, 12]。不要输出任何其他文字。

${myBlock}

${candidateBlocks}`;
    const ai = await callDeepSeek([{ role: 'user', content: prompt }], { max_tokens: 200, temperature: 0.2 });
    if (ai) {
      const raw = ai.replace(/[\s\S]*?(\[[\d,\s]*\])[\s\S]*/, '$1').trim();
      try {
        const order = JSON.parse(raw);
        if (Array.isArray(order) && order.length > 0) {
          const idSet = new Set(toRank.map((c) => c.user_id));
          const valid = order.filter((id) => idSet.has(Number(id)));
          if (valid.length > 0) {
            const top = valid.slice(0, 3);
            const pickId = top[Math.floor(Math.random() * top.length)];
            const found = candidates.find((c) => c.user_id === pickId);
            if (found) chosen = found;
          }
        }
      } catch (_) {}
    }
  }

  const userA = Math.min(req.userId, chosen.user_id);
  const userB = Math.max(req.userId, chosen.user_id);
  let matchId = null;
  let matchReason = null;
  try {
    const insertResult = await db.prepare('INSERT INTO matches (user_a, user_b, mode) VALUES (?, ?, ?)').run(userA, userB, 'soul');
    matchId = insertResult.lastInsertRowid;
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT' || e.code === '23505') {
      const existing = await db.prepare('SELECT id, match_reason FROM matches WHERE user_a = ? AND user_b = ? AND mode = ?').get(userA, userB, 'soul');
      if (existing) matchReason = existing.match_reason;
      return res.json({ matched: true, partnerId: chosen.user_id, existing: true, matchReason: matchReason || undefined });
    }
    throw e;
  }
  if (matchId && process.env.DEEPSEEK_API_KEY) {
    const chosenRows = await db.prepare('SELECT question_id, answer FROM soul_answers WHERE user_id = ?').all(chosen.user_id);
    const chosenMap = Object.fromEntries(chosenRows.map((r) => [r.question_id, r.answer || '']));
    const myBlock = `【我的回答】\n${formatQA(myMap)}`;
    const otherBlock = `【对方回答】\n${formatQA(chosenMap)}`;
    const reasonPrompt = `你是一个恋爱观契合度助手。根据下面两人对同一组灵魂共鸣题的回答，用一两句话概括「为什么这两位比较适合」或「契合点在哪里」。只输出这一两句话，不要称呼、不要编号、不要其他解释。

${myBlock}

${otherBlock}`;
    const aiReason = await callDeepSeek([{ role: 'user', content: reasonPrompt }], { max_tokens: 120, temperature: 0.3 });
    if (aiReason && typeof aiReason === 'string') {
      matchReason = aiReason.trim().slice(0, 500);
      await db.prepare('UPDATE matches SET match_reason = ? WHERE id = ?').run(matchReason, matchId);
    }
  }
  return res.json({ matched: true, partnerId: chosen.user_id, matchReason: matchReason || undefined });
});

// 当前用户与某人的匹配详情（含灵魂匹配原因），供匹配结果页展示
router.get('/with/:partnerId', async (req, res) => {
  const partnerId = Number(req.params.partnerId);
  if (!Number.isInteger(partnerId) || partnerId < 1) {
    return res.status(400).json({ error: 'Invalid partnerId' });
  }
  const userA = Math.min(req.userId, partnerId);
  const userB = Math.max(req.userId, partnerId);
  const row = await db.prepare('SELECT id, mode, created_at, match_reason FROM matches WHERE user_a = ? AND user_b = ? ORDER BY created_at DESC LIMIT 1').get(userA, userB);
  if (!row) return res.status(404).json({ error: '未找到匹配记录' });
  res.json({ matchId: row.id, mode: row.mode, createdAt: row.created_at, matchReason: row.match_reason || undefined });
});

// 当前用户的所有匹配（含对方昵称，供聊天列表用）；同一对象只显示一次（去重），并默认包含三个聊天角色
const BOT_IDS = [0, 1, 2];
const BOT_NAMES = { 0: '最伟大最尊敬的导师', 1: '看不上你对象的朋友', 2: '知心姐姐' };

router.get('/list', async (req, res) => {
  const rows = await db.prepare(`
    SELECT m.id, m.user_a, m.user_b, m.mode, m.created_at, m.match_reason, u.nickname AS partner_nickname
    FROM matches m
    JOIN users u ON u.id = (CASE WHEN m.user_a = ? THEN m.user_b ELSE m.user_a END)
    WHERE m.user_a = ? OR m.user_b = ?
    ORDER BY m.created_at DESC
  `).all(req.userId, req.userId, req.userId);
  const byPartner = new Map();
  for (const r of rows) {
    const partnerId = r.user_a === req.userId ? r.user_b : r.user_a;
    if (byPartner.has(partnerId)) continue;
    const fromRow = r.partner_nickname ?? r.partner_Nickname ?? r.PARTNER_NICKNAME;
    const u = await db.prepare('SELECT nickname FROM users WHERE id = ?').get(partnerId);
    const partnerNickname = fromRow ?? u?.nickname ?? null;
    byPartner.set(partnerId, {
      matchId: r.id,
      partnerId,
      partnerNickname,
      mode: r.mode,
      createdAt: r.created_at,
      matchReason: r.match_reason || undefined,
    });
  }
  const list = Array.from(byPartner.values());
  const now = new Date().toISOString();
  for (const id of BOT_IDS) {
    list.unshift({
      matchId: `bot-${id}`,
      partnerId: id,
      partnerNickname: BOT_NAMES[id],
      mode: 'soul',
      createdAt: now,
    });
  }
  res.json({ list });
});

export default router;
