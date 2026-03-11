import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOtherProfile } from '../api';
import { getDegreeDisplay, getCollegeDisplay } from '../data/mpu';
import './MatchResult.css';

function showValue(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join('、') : '—';
  return String(v);
}

export default function MatchResult({ user }) {
  const { partnerId } = useParams();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getOtherProfile(partnerId)
      .then((data) => {
        if (data.self) return;
        setPartner(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [partnerId]);

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
  const cities = Array.isArray(p.cities) ? p.cities : (typeof p.cities === 'string' ? (() => { try { return JSON.parse(p.cities); } catch { return []; } })() : []);
  const photos = Array.isArray(p.photos) ? p.photos : (typeof p.photos === 'string' ? (() => { try { return JSON.parse(p.photos); } catch { return []; } })() : []);

  const basicItems = [
    { label: '学位', value: getDegreeDisplay(p.degree) },
    { label: '性别', value: p.gender },
    { label: '学院', value: getCollegeDisplay(p.college) },
    { label: '专业', value: p.major },
    { label: '生日', value: p.birthday },
  ];
  const loveItems = [
    { label: '希望匹配的性别', value: p.preferred_gender },
    { label: 'MBTI', value: p.mbti },
    { label: '感情经历', value: p.relationship_count },
    { label: '最长一段恋爱时间', value: p.longest_relationship },
    { label: '谈恋爱的目的', value: p.purpose },
    { label: '想恋爱指数', value: p.love_index != null ? `${p.love_index} / 5` : '—' },
  ];
  const placeItems = [
    { label: '发展的省份', value: cities.length ? cities.join('、') : '—' },
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
          {photos.length > 0 ? (
            <div className="match-result__avatar-wrap">
              <img src={photos[0]} alt="" className="match-result__avatar" />
            </div>
          ) : (
            <div className="match-result__avatar-placeholder" />
          )}
          <h1 className="match-result__name">{u.nickname}</h1>
          <Link to={`/chat/${partnerId}`} className="match-result__chat-btn">
            与 TA 聊天
          </Link>
        </section>

        {p.intro && (
          <section className="match-result__card match-result__intro">
            <h2 className="match-result__card-title">个人介绍</h2>
            <p className="match-result__intro-text">{p.intro}</p>
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
