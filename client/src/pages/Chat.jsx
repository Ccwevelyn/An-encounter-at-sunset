import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOtherProfile, getMessages, sendMessage } from '../api';
import { BOT_NAMES, isBotId } from '../constants/chat';
import mentorAvatar from '../assets/mentor-avatar.png';
import './Chat.css';

const MENTOR_FIRST = {
  id: 'first',
  sender_id: 0,
  content: 'hello,我是王哥',
  created_at: new Date().toISOString(),
  isMine: false,
};
const BOT_AVATAR = { '0': mentorAvatar };

export default function Chat({ user }) {
  const { partnerId } = useParams();
  const isBot = isBotId(partnerId);
  const backTo = isBot ? '/chats' : `/match/${partnerId}`;

  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const title = isBot ? (BOT_NAMES[Number(partnerId)] || '聊天') : (partner?.user?.nickname || '聊天');

  useEffect(() => {
    if (!isBot) {
      getOtherProfile(partnerId)
        .then((d) => { if (!d.self) setPartner(d); })
        .catch(() => {});
    }
  }, [partnerId, isBot]);

  useEffect(() => {
    getMessages(partnerId)
      .then((d) => setMessages(Array.isArray(d.messages) ? d.messages : []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [partnerId]);

  useEffect(() => {
    const id = setInterval(() => {
      getMessages(partnerId)
        .then((d) => setMessages(Array.isArray(d.messages) ? d.messages : []))
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [partnerId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const onSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const d = await sendMessage(partnerId, text);
      const mine = { ...d.message, isMine: true };
      const bots = (d.botMessages || (d.botMessage ? [d.botMessage] : [])).map((b) => ({ ...b, isMine: false }));
      setMessages((prev) => [...prev, mine, ...bots]);
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (!isBot && loading && !partner) {
    return (
      <div className="chat-page">
        <div className="chat-page__loading">加载中…</div>
      </div>
    );
  }

  const list =
    isBot && partnerId === '0' && messages.length === 0 ? [MENTOR_FIRST] : messages;

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
        {list.map((msg, i) => {
          const mine = msg.isMine === true;
          return (
            <li
              key={msg.id != null ? msg.id : `i-${i}`}
              className={`chat-page__msg ${mine ? 'chat-page__msg--mine' : 'chat-page__msg--other'}`}
              style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}
            >
              <div
                className="chat-page__bubble"
                style={mine ? { marginLeft: 'auto', marginRight: 0 } : undefined}
              >
                <span className="chat-page__msg-content">{msg.content}</span>
                <span className="chat-page__msg-time">
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="chat-page__form" onSubmit={onSend}>
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
