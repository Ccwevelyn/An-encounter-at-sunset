import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../api';
import './Auth.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^p\d{7}@mpu\.edu\.mo$/i.test((email || '').trim())) {
      setError('为打造更好的交流环境，请填写真实的邮箱');
      return;
    }
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      onLogin(data);
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <p className="auth__site-name">在日落下相遇</p>
        <h1 className="auth__title">登录</h1>
        <form onSubmit={handleSubmit} className="auth__form">
          {error && <p className="auth__error">{error}</p>}
          <label>
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="P1234567@mpu.edu.mo"
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
        <p className="auth__link">
          新用户？<Link to="/register">去注册</Link>
        </p>
      </div>
    </div>
  );
}
