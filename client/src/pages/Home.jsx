import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { matchRandom, matchFate, matchSoul } from '../api';
import './Home.css';

export default function Home({ user, onLogout, refreshUser }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSoul = async () => {
    setMode('soul');
    setError('');
    setLoading(true);
    try {
      const res = await matchSoul();
      if (res.matched && res.partnerId) {
        navigate(`/match/${res.partnerId}`, { replace: true });
      } else {
        setError(res.error || '暂无灵魂共鸣候选，先填写主观题或邀请更多人参与');
      }
    } catch (err) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRandom = async () => {
    setMode('random');
    setError('');
    setLoading(true);
    try {
      const res = await matchRandom();
      if (res.matched && res.partnerId) {
        navigate(`/match/${res.partnerId}`, { replace: true });
      } else {
        setError(res.message || '暂无同时段匹配的用户，请稍后再试或邀请更多朋友使用');
      }
    } catch (err) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFate = async () => {
    setMode('fate');
    setError('');
    setLoading(true);
    try {
      const res = await matchFate();
      if (res.matched && res.partnerId) {
        navigate(`/match/${res.partnerId}`, { replace: true });
      } else {
        setError(res.error || '缘分还在远方，或许可以邀请更多朋友使用本网页');
      }
    } catch (err) {
      setError(err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <header className="home__header">
        <span className="home__title">在日落下相遇</span>
        <nav className="home__nav">
          <Link to="/chats">聊天</Link>
          <Link to="/profile">个人页面</Link>
          <Link to="/author">作者的话</Link>
          <button type="button" className="home__logout" onClick={onLogout}>
            退出
          </button>
        </nav>
      </header>

      <main className="home__main">
        <p className="home__welcome">你好，{user?.nickname}。</p>

        {!user?.profile && (
          <section className="home__complete-profile">
            <p>请先完善个人资料以使用匹配功能。</p>
            <Link to="/onboarding" className="home__complete-btn">去完善资料</Link>
          </section>
        )}

        {user?.profile && (
        <section className="home__modes">
          <div className="home__mode-card">
            <h2>随机匹配</h2>
            <p>可选择开启随机匹配状态，开启后即可被匹配；按双向性别偏好过滤后随机一人。</p>
            <button type="button" onClick={handleRandom} disabled={loading}>
              {loading && mode === 'random' ? '匹配中…' : '开始随机匹配'}
            </button>
          </div>
          <div className="home__mode-card">
            <h2>缘分匹配</h2>
            <p>根据你所填信息进行推送匹配：恋爱目的、城市、想恋爱指数、经历、MBTI 等。</p>
            <button type="button" onClick={handleFate} disabled={loading}>
              {loading && mode === 'fate' ? '匹配中…' : '开始缘分匹配'}
            </button>
          </div>
          <div className="home__mode-card">
            <h2>灵魂共鸣</h2>
            <p>回答 3–5 道主观题，用文字表达想法，系统将为你找到想法更接近的人（可先填主观题再匹配）。</p>
            <Link to="/soul" className="home__link" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>去填主观题</Link>
            <button type="button" onClick={handleSoul} disabled={loading}>
              {loading && mode === 'soul' ? '匹配中…' : '开始灵魂共鸣匹配'}
            </button>
          </div>
        </section>
        )}

        {error && <p className="home__error">{error}</p>}

        <section className="home__links">
          <Link to="/chats" className="home__link">聊天 · 查看所有对话</Link>
          <Link to="/profile" className="home__link">用户自定义 · 个人资料与介绍</Link>
          <Link to="/author" className="home__link">作者的话</Link>
        </section>
      </main>
    </div>
  );
}
