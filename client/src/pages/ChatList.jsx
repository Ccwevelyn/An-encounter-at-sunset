import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMatchList, getOtherProfile } from '../api';
import './ChatList.css';

export default function ChatList({ user, onLogout }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partnerNames, setPartnerNames] = useState({});

  useEffect(() => {
    getMatchList()
      .then((data) => setList(data.list || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  // 当列表中有项缺少 partnerNickname 时，按 partnerId 拉取昵称（仅拉取尚未请求过的）
  const requestedIds = React.useRef(new Set());
  useEffect(() => {
    list.forEach((item) => {
      if (!item.partnerId || item.partnerNickname || partnerNames[item.partnerId] !== undefined || requestedIds.current.has(item.partnerId)) return;
      requestedIds.current.add(item.partnerId);
      getOtherProfile(String(item.partnerId))
        .then((data) => {
          if (data?.user?.nickname) setPartnerNames((prev) => ({ ...prev, [item.partnerId]: data.user.nickname }));
        })
        .catch(() => {});
    });
  }, [list]);

  const displayName = (item) => item.partnerNickname || partnerNames[item.partnerId] || null;
  const isBot = (id) => [0, 1, 2].includes(Number(id));
  const botList = list.filter((item) => isBot(item.partnerId));
  const realList = list.filter((item) => !isBot(item.partnerId));

  const renderItem = (item) => (
    <li key={item.matchId} className="chat-list-page__item">
      <Link to={`/chat/${item.partnerId}`} className="chat-list-page__link">
        <span className="chat-list-page__name">{displayName(item) || `用户 ${item.partnerId}`}</span>
        <span className="chat-list-page__arrow">→</span>
      </Link>
      {isBot(item.partnerId) && (
        <Link to={`/match/${item.partnerId}`} className="chat-list-page__profile-link">档案</Link>
      )}
    </li>
  );

  return (
    <div className="chat-list-page">
      <header className="chat-list-page__header">
        <Link to="/" className="chat-list-page__back">← 返回</Link>
        <span className="chat-list-page__title">聊天</span>
        <span className="chat-list-page__placeholder" />
      </header>

      <main className="chat-list-page__main">
        {loading ? (
          <p className="chat-list-page__loading">加载中…</p>
        ) : (
          <>
            <section className="chat-list-page__block">
              <h2 className="chat-list-page__block-title">我的 AI</h2>
              <ul className="chat-list-page__list">
                {botList.map(renderItem)}
              </ul>
            </section>
            <section className="chat-list-page__block">
              <h2 className="chat-list-page__block-title">真人</h2>
              {realList.length === 0 ? (
                <p className="chat-list-page__empty">暂无匹配的真人，去匹配一个吧。</p>
              ) : (
                <ul className="chat-list-page__list">
                  {realList.map(renderItem)}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
