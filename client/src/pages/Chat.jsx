import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOtherProfile, getMessages, sendMessage } from '../api';
import { BOT_NAMES, isBotId } from '../constants/chat';

function mergeMyOther(myMessages, otherMessages) {
  const withMine = (myMessages || []).map((m) => ({ ...m, isMine: true }));
  const withOther = (otherMessages || []).map((m) => ({ ...m, isMine: false }));
  return [...withMine, ...withOther].sort(
    (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
  );
}
import mentorAvatar from '../assets/mentor-avatar.png';
import './Chat.css';

const MENTOR_FIRST_MSG = {
  id: 'first',
  sender_id: 0,
  content: 'hello,我是王哥',
  created_at: new Date().toISOString(),
};
const BOT_AVATAR = { '0': mentorAvatar };

export default function Chat({ user }) {
  const { partnerId } = useParams();
  const isBot = isBotId(partnerId);
  const backTo = isBot ? '/chats' : `/match/${partnerId}`;

  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const title = isBot ? (BOT_NAMES[Number(partnerId)] || '聊天') : (partner?.user?.nickname || '聊天');

  useEffect(() => {
    if (isBot) return;
    getOtherProfile(partnerId)
      .then((data) => { if (!data.self) setPartner(data); })
      .catch(() => {});
  }, [partnerId, isBot]);

  useEffect(() => {
    getMessages(partnerId)
      .then((data) => {
        if (data.myMessages != null && data.otherMessages != null) {
          setMessages(mergeMyOther(data.myMessages, data.otherMessages));
        } else {
          setMessages(data.messages || []);
        }
        if (data.currentUserId != null) setCurrentUserId(Number(data.currentUserId));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [partnerId]);

  useEffect(() => {
    const t = setInterval(() => {
      getMessages(partnerId)
        .then((data) => {
          if (data.myMessages != null && data.otherMessages != null) {
            setMessages(mergeMyOther(data.myMessages, data.otherMessages));
          } else {
            setMessages(data.messages || []);
          }
          if (data.currentUserId != null) setCurrentUserId(Number(data.currentUserId));
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(t);
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
      const mine = { ...data.message, isMine: true };
      const others = botList.map((b) => ({ ...b, isMine: false }));
      setMessages((m) => [...m, mine, ...others]);
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

  const displayMessages =
    isBot && partnerId === '0' && messages.length === 0
      ? [{ ...MENTOR_FIRST_MSG, isMine: false }]
      : messages;

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
        {displayMessages.map((msg, idx) => {
          const mine = msg.isMine === true;
          return (
            <li
              key={msg.id != null ? `msg-${msg.id}` : `msg-${idx}-${msg.sender_id}-${msg.created_at ?? ''}`}
              className={`chat-page__msg ${mine ? 'chat-page__msg--mine' : 'chat-page__msg--other'}`}
              data-mine={mine}
              style={mine ? { justifyContent: 'flex-end', flexDirection: 'row' } : { justifyContent: 'flex-start' }}
            >
              <div
                className="chat-page__bubble"
                style={mine ? { marginLeft: 'auto', marginRight: 0, maxWidth: '85%' } : undefined}
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
