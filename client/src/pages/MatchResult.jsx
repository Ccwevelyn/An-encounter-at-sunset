import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getOtherProfile, getMatchWith } from '../api';
import { getDegreeDisplay, getCollegeDisplay } from '../data/mpu';
import { BOT_NAMES, isBotId } from '../constants/chat';
import mentorAvatar from '../assets/mentor-avatar.png';
import './MatchResult.css';

const BOT_AVATAR = { '0': mentorAvatar };
const BOT_BIOS = {
  '0': '一位善于提问、常给你启发的思考导师。不直接给答案，而是引导你往深处想，帮你理清思路、看见盲区。适合想被推一把、愿意被问住的人。',
  '1': '一位嘴毒心不坏的朋友，专治恋爱脑。擅长吐槽、泼冷水、戳破幻想，用犀利话把你拉回现实。聊完可能不爽，但多半会清醒一点。',
  '2': '一位温柔体贴的知心大姐姐。善于倾听、共情，在你难过或纠结时给安慰与建议，语气包容不说教。适合想被理解、需要情绪出口的时候。',
};

function showValue(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join('、') : '—';
  return String(v);
}

export default function MatchResult({ user }) {
  const { partnerId } = useParams();
  const location = useLocation();
  const pid = String(partnerId ?? '');
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchReason, setMatchReason] = useState(location.state?.matchReason ?? null);
  const isBot = isBotId(partnerId);

  useEffect(() => {
    getOtherProfile(partnerId)
      .then((data) => {
        if (data.self) return;
        setPartner(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [partnerId]);

  useEffect(() => {
    if (isBot || !partnerId) return;
    if (location.state?.matchReason) {
      setMatchReason(location.state.matchReason);
      return;
    }
    getMatchWith(partnerId).then((data) => {
      if (data?.matchReason) setMatchReason(data.matchReason);
    }).catch(() => {});
  }, [partnerId, isBot, location.state?.matchReason]);

  // 三个 AI 角色（0 导师、1 看不上你对象的朋友、2 知心姐姐）：直接用本地数据展示档案，不依赖接口
  if (isBot) {
    const name = BOT_NAMES[pid] || (partner?.user?.nickname) || '角色';
    const bio = BOT_BIOS[pid] || '';
    const avatarUrl = BOT_AVATAR[pid];
    return (
      <div className="match-result">
        <header className="match-result__header">
          <Link to="/chats" className="match-result__back">← 返回</Link>
          <span className="match-result__brand">角色档案</span>
          <Link to={`/chat/${pid}`} className="match-result__nav-chat">与 TA 聊天</Link>
        </header>
        <main className="match-result__main">
          <section className="match-result__hero">
            {avatarUrl ? (
              <div className="match-result__avatar-wrap">
                <img src={avatarUrl} alt="" className="match-result__avatar" />
              </div>
            ) : (
              <div className="match-result__avatar-placeholder" />
            )}
            <h1 className="match-result__name">{name}</h1>
            <Link to={`/chat/${pid}`} className="match-result__chat-btn">
              与 TA 聊天
            </Link>
          </section>
          <section className="match-result__card match-result__intro">
            <h2 className="match-result__card-title">人物小传</h2>
            <p className="match-result__intro-text">{bio}</p>
          </section>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="match-result">
        <header className="match-result__header">
          <Link to="/" className="match-result__back">← 返回</Link>
          <span className="match-result__brand">匹配结果</span>
          <span className="match-result__placeholder" />
        </header>
        <div className="match-result__loading">加载中…</div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="match-result">
        <header className="match-result__header">
          <Link to="/" className="match-result__back">← 返回</Link>
          <span className="match-result__brand">匹配结果</span>
          <span className="match-result__placeholder" />
        </header>
        <p className="match-result__error">{error || '未找到对方信息'}</p>
        <Link to="/" className="match-result__back-link">返回主页</Link>
      </div>
    );
  }

  const { user: u, profile: p } = partner;

  const cities = Array.isArray(p?.cities) ? p.cities : (typeof p?.cities === 'string' ? (() => { try { return JSON.parse(p.cities); } catch { return []; } })() : []);
  const photos = Array.isArray(p?.photos) ? p.photos : (typeof p?.photos === 'string' ? (() => { try { return JSON.parse(p.photos); } catch { return []; } })() : []);
  const avatarUrl = p?.avatar || (photos.length > 0 ? photos[0] : null);

  const basicItems = [
    { label: '学位', value: getDegreeDisplay(p.degree) },
    { label: '性别', value: p.gender },
    { label: '学院', value: getCollegeDisplay(p.college) },
    { label: '专业', value: p.major },
    { label: '生日', value: p.birthday },
  ];
  const loveItems = [
    { label: '希望匹配到的性别', value: p.preferred_gender },
    { label: 'MBTI', value: p.mbti },
    { label: '感情经历', value: p.relationship_count },
    { label: '最长一段恋爱时间', value: p.longest_relationship },
    { label: '谈恋爱的目的', value: p.purpose },
    { label: '想恋爱指数', value: p.love_index != null ? `${p.love_index} / 5` : '—' },
  ];
  const placeItems = [
    { label: '发展的城市', value: cities.length ? cities.join('、') : '—' },
    { label: '月花销', value: p.monthly_budget },
    { label: '家乡省份', value: p.hometown_province },
  ];

  return (
    <div className="match-result">
      <header className="match-result__header">
        <Link to="/" className="match-result__back">← 返回</Link>
        <span className="match-result__brand">匹配结果</span>
        <Link to={`/chat/${partnerId}`} className="match-result__nav-chat">与 TA 聊天</Link>
      </header>

      <main className="match-result__main">
        <section className="match-result__hero">
          {avatarUrl ? (
            <div className="match-result__avatar-wrap">
              <img src={avatarUrl} alt="" className="match-result__avatar" />
            </div>
          ) : (
            <div className="match-result__avatar-placeholder" />
          )}
          <h1 className="match-result__name">{u.nickname}</h1>
          <Link to={`/chat/${partnerId}`} className="match-result__chat-btn">
            与 TA 聊天
          </Link>
        </section>

        {matchReason && (
          <section className="match-result__card match-result__reason">
            <h2 className="match-result__card-title">为什么你们适合</h2>
            <p className="match-result__intro-text">{matchReason}</p>
          </section>
        )}

        {(p.intro || photos.length > 0) && (
          <section className="match-result__card match-result__intro">
            <h2 className="match-result__card-title">个人介绍</h2>
            {p.intro && <p className="match-result__intro-text">{p.intro}</p>}
            {photos.length > 0 && (
              <div className="match-result__photos">
                {photos.map((src, i) => (
                  <img key={i} src={src} alt="" className="match-result__photo" />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="match-result__card">
          <h2 className="match-result__card-title">基本信息</h2>
          <ul className="match-result__list">
            {basicItems.map(({ label, value }) => (
              <li key={label} className="match-result__row">
                <span className="match-result__label">{label}</span>
                <span className="match-result__value">{showValue(value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="match-result__card">
          <h2 className="match-result__card-title">性格与恋爱</h2>
          <ul className="match-result__list">
            {loveItems.map(({ label, value }) => (
              <li key={label} className="match-result__row">
                <span className="match-result__label">{label}</span>
                <span className="match-result__value">{showValue(value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="match-result__card">
          <h2 className="match-result__card-title">地域与生活</h2>
          <ul className="match-result__list">
            {placeItems.map(({ label, value }) => (
              <li key={label} className="match-result__row">
                <span className="match-result__label">{label}</span>
                <span className="match-result__value">{showValue(value)}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
