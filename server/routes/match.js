import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';

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
router.post('/random/join', (req, res) => {
  const myProfile = db.prepare('SELECT random_mode_enabled, gender, preferred_gender FROM profiles WHERE user_id = ?').get(req.userId);
  if (!myProfile) {
    return res.status(400).json({ error: '请先完善个人资料' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE profiles SET random_mode_enabled = 1, random_mode_ts = ? WHERE user_id = ?').run(now, req.userId);

  const all = db.prepare(`
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
    db.prepare('INSERT INTO matches (user_a, user_b, mode) VALUES (?, ?, ?)').run(userA, userB, 'random');
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') {
      return res.json({ matched: true, partnerId: partner.user_id, existing: true });
    }
    throw e;
  }
  return res.json({ matched: true, partnerId: partner.user_id });
});

router.post('/fate', (req, res) => {
  const myProfile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  if (!myProfile) {
    return res.status(400).json({ error: '请先完善个人资料' });
  }

  const purpose = myProfile.purpose;
  const allProfiles = db.prepare(`
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
    db.prepare('INSERT INTO matches (user_a, user_b, mode) VALUES (?, ?, ?)').run(userA, userB, 'fate');
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') {
      return res.json({ matched: true, partnerId: chosen.user_id, existing: true });
    }
    throw e;
  }
  return res.json({ matched: true, partnerId: chosen.user_id });
});

// 灵魂共鸣：3–5 道主观题，用户文字回答，后续可接 AI 分析匹配
router.get('/soul/questions', (req, res) => {
  const rows = db.prepare('SELECT id, question, sort_order FROM soul_questions ORDER BY sort_order, id').all();
  res.json({ questions: rows });
});

router.post('/soul/answers', (req, res) => {
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: '请至少回答一题' });
  }
  for (const a of answers) {
    const qId = a.questionId ?? a.question_id;
    const text = a.answer != null ? String(a.answer).trim() : '';
    if (!qId || text === '') continue;
    db.prepare(`
      INSERT OR REPLACE INTO soul_answers (user_id, question_id, answer) VALUES (?, ?, ?)
    `).run(req.userId, qId, text);
  }
  res.json({ ok: true });
});

router.post('/soul', (req, res) => {
  const myProfile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  if (!myProfile) {
    return res.status(400).json({ error: '请先完善个人资料' });
  }
  const myGender = myProfile.gender;
  const myPreferred = myProfile.preferred_gender;
  const withSoul = db.prepare(`
    SELECT DISTINCT user_id FROM soul_answers WHERE user_id != ?
  `).all(req.userId).map(r => r.user_id);
  if (withSoul.length === 0) {
    return res.status(200).json({ matched: false, error: '暂无灵魂共鸣候选，先填写主观题或邀请更多人参与' });
  }
  const placeholders = withSoul.map(() => '?').join(',');
  let candidates = db.prepare(`
    SELECT p.*, u.nickname FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id != ? AND p.user_id IN (${placeholders})
  `).all(req.userId, ...withSoul);
  candidates = candidates.filter(p => acceptsGender(myPreferred, p.gender) && acceptsGender(p.preferred_gender, myGender));
  if (candidates.length === 0) {
    return res.status(200).json({ matched: false, error: '暂无灵魂共鸣候选，先填写主观题或邀请更多人参与' });
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const userA = Math.min(req.userId, chosen.user_id);
  const userB = Math.max(req.userId, chosen.user_id);
  try {
    db.prepare('INSERT INTO matches (user_a, user_b, mode) VALUES (?, ?, ?)').run(userA, userB, 'soul');
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') {
      return res.json({ matched: true, partnerId: chosen.user_id, existing: true });
    }
    throw e;
  }
  return res.json({ matched: true, partnerId: chosen.user_id });
});

// 当前用户的所有匹配（含对方昵称，供聊天列表用）；同一对象只显示一次（去重），并默认包含 Test 机器人
const TEST_PARTNER_ID = 0;

router.get('/list', (req, res) => {
  const rows = db.prepare(`
    SELECT m.id, m.user_a, m.user_b, m.mode, m.created_at, u.nickname AS partner_nickname
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
    const partnerNickname = fromRow ?? db.prepare('SELECT nickname FROM users WHERE id = ?').get(partnerId)?.nickname ?? null;
    byPartner.set(partnerId, {
      matchId: r.id,
      partnerId,
      partnerNickname,
      mode: r.mode,
      createdAt: r.created_at,
    });
  }
  const list = Array.from(byPartner.values());
  list.unshift({
    matchId: 'test',
    partnerId: TEST_PARTNER_ID,
    partnerNickname: 'Test',
    mode: 'soul',
    createdAt: new Date().toISOString(),
  });
  res.json({ list });
});

export default router;
