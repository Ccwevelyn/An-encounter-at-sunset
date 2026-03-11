import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOtherProfile, getMessages, sendMessage } from '../api';
import './Chat.css';

export default function Chat({ user }) {
  const { partnerId } = useParams();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    getOtherProfile(partnerId)
      .then((data) => {
        if (!data.self) setPartner(data);
      })
      .catch(() => {});
  }, [partnerId]);

  useEffect(() => {
    getMessages(partnerId)
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [partnerId]);

  // 轮询：对方发来的新消息能在本页显示
  useEffect(() => {
    const interval = setInterval(() => {
      getMessages(partnerId)
        .then((data) => setMessages(data.messages || []))
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [partnerId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { message } = await sendMessage(partnerId, text);
      setMessages((m) => [...m, message]);
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading && !partner) {
    return (
      <div className="chat-page">
        <div className="chat-page__loading">加载中…</div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <header className="chat-page__header">
        <Link to={`/match/${partnerId}`} className="chat-page__back">← 返回</Link>
        <div className="chat-page__title-wrap">
          {partner?.profile?.avatar ? (
            <img src={partner.profile.avatar} alt="" className="chat-page__avatar" />
          ) : (
            <span className="chat-page__avatar-placeholder" />
          )}
          <span className="chat-page__title">{partner?.user?.nickname || '聊天'}</span>
        </div>
      </header>

      <ul className="chat-page__list" ref={listRef}>
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={`chat-page__msg ${msg.sender_id === user?.id ? 'mine' : ''}`}
          >
            <span className="chat-page__msg-content">{msg.content}</span>
            <span className="chat-page__msg-time">
              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </li>
        ))}
      </ul>

      <form className="chat-page__form" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息…"
          autoComplete="off"
        />
        <button type="submit" disabled={sending || !input.trim()}>
          发送
        </button>
      </form>
    </div>
  );
}
