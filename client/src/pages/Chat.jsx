import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOtherProfile, getMessages, sendMessage } from '../api';
import mentorAvatar from '../assets/mentor-avatar.png';
import './Chat.css';

const BOT_IDS = ['0', '1', '2'];
const BOT_SENDER_IDS = [0, 1, 2]; // 消息里 sender_id 为 0/1/2 的为 AI，显示在左侧
const BOT_NAMES = { '0': '最伟大最尊敬的导师', '1': '看不上你对象的朋友', '2': '知心姐姐' };
const BOT_AVATAR = { '0': mentorAvatar };
// 导师首句，前端兜底（接口未返回时也显示）
const MENTOR_FIRST_MSG = { id: 'first', sender_id: 0, content: 'hello,我是王哥', created_at: new Date().toISOString() };

export default function Chat({ user }) {
  const { partnerId } = useParams();
  const isBot = BOT_IDS.includes(String(partnerId));
  const backTo = isBot ? '/chats' : `/match/${partnerId}`;
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const title = isBot ? (BOT_NAMES[partnerId] || '聊天') : (partner?.user?.nickname || '聊天');

  useEffect(() => {
    getOtherProfile(partnerId)
      .then((data) => {
        if (!data.self) setPartner(data);
      })
      .catch(() => {});
  }, [partnerId]);

  useEffect(() => {
    getMessages(partnerId)
      .then((data) => {
        setMessages(data.messages || []);
        if (data.currentUserId != null) setCurrentUserId(Number(data.currentUserId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [partnerId]);

  // 轮询：对方发来的新消息能在本页显示
  useEffect(() => {
    const interval = setInterval(() => {
      getMessages(partnerId)
        .then((data) => {
          setMessages(data.messages || []);
          if (data.currentUserId != null) setCurrentUserId(Number(data.currentUserId));
        })
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
      const data = await sendMessage(partnerId, text);
      if (data.currentUserId != null) setCurrentUserId(Number(data.currentUserId));
      const botList = data.botMessages || (data.botMessage ? [data.botMessage] : []);
      setMessages((m) => [...m, data.message, ...botList]);
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // 仅真人且未拿到对方信息时显示加载；bot 直接展示页面（含头像）
  if (!isBot && loading && !partner) {
    return (
      <div className="chat-page">
        <div className="chat-page__loading">加载中…</div>
      </div>
    );
  }

  // 导师(0) 无消息时前端兜底显示首句
  const displayMessages = isBot && partnerId === '0' && messages.length === 0
    ? [MENTOR_FIRST_MSG]
    : messages;
  const myId = (currentUserId != null && currentUserId !== 0) ? Number(currentUserId) : Number(user?.id ?? user?.userId ?? 0) || 0;

  return (
    <div className="chat-page">
      <header className="chat-page__header">
        <Link to={backTo} className="chat-page__back">← 返回</Link>
        <div className="chat-page__title-wrap">
          {isBot && BOT_AVATAR[partnerId] ? (
            <img src={BOT_AVATAR[partnerId]} alt="" className="chat-page__avatar" />
          ) : partner?.profile?.avatar ? (
            <img src={partner.profile.avatar} alt="" className="chat-page__avatar" />
          ) : (
            <span className="chat-page__avatar-placeholder" />
          )}
          <span className="chat-page__title">{title}</span>
          {isBot && (
            <Link to={`/match/${partnerId}`} className="chat-page__profile-link">角色档案</Link>
          )}
        </div>
      </header>

      <ul className="chat-page__list" ref={listRef}>
        {displayMessages.map((msg) => {
          const sid = msg.sender_id != null ? Number(msg.sender_id) : NaN;
          const isMine = myId > 0 && myId === sid && !BOT_SENDER_IDS.includes(sid);
          return (
          <li
            key={msg.id ?? `${msg.sender_id}-${msg.created_at || ''}`}
            className={`chat-page__msg ${isMine ? 'chat-page__msg--mine' : 'chat-page__msg--other'}`}
          >
            <div className="chat-page__bubble">
              <span className="chat-page__msg-content">{msg.content}</span>
              <span className="chat-page__msg-time">
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </li>
          );
        })}
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
