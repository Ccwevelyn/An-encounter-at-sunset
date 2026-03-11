import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api';
import './Auth.css';

const EMAIL_SUFFIX = '@mpu.edu.mo';

export default function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim().toLowerCase().endsWith(EMAIL_SUFFIX)) {
      setError('邮箱须为 @mpu.edu.mo 结尾');
      return;
    }
    setLoading(true);
    try {
      const data = await register(email.trim().toLowerCase(), nickname.trim(), password);
      onRegister(data);
    } catch (err) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">注册</h1>
        <form onSubmit={handleSubmit} className="auth__form">
          {error && <p className="auth__error">{error}</p>}
          <label>
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`xxx${EMAIL_SUFFIX}`}
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>昵称</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? '注册中…' : '注册'}
          </button>
        </form>
        <p className="auth__link">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
}
