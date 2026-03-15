import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { login, sendLoginCode, loginWithCode } from '../api';
import './Auth.css';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('password'); // 'password' | 'code'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const t = setInterval(() => setCodeCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [codeCooldown]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

  const handleSendCode = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !em.endsWith('@mpu.edu.mo')) {
      setError('请填写有效的 @mpu.edu.mo 邮箱');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendLoginCode(em);
      setCodeCooldown(60);
    } catch (err) {
      setError(err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginWithCode(email.trim(), code);
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
        <h1 className="auth__title">登录</h1>
        <div className="auth__tabs">
          <button
            type="button"
            className={mode === 'password' ? 'auth__tab active' : 'auth__tab'}
            onClick={() => { setMode('password'); setError(''); }}
          >
            密码登录
          </button>
          <button
            type="button"
            className={mode === 'code' ? 'auth__tab active' : 'auth__tab'}
            onClick={() => { setMode('code'); setError(''); }}
          >
            验证码登录
          </button>
        </div>
        {mode === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="auth__form">
            {error && <p className="auth__error">{error}</p>}
            <label>
              <span>邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="xxx@mpu.edu.mo"
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
        ) : (
          <form onSubmit={handleCodeSubmit} className="auth__form">
            {error && <p className="auth__error">{error}</p>}
            <label>
              <span>邮箱</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="xxx@mpu.edu.mo"
                required
                autoComplete="email"
              />
            </label>
            <label>
              <span>验证码</span>
              <div className="auth__code-row">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="4 位验证码"
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className="auth__code-btn"
                  onClick={handleSendCode}
                  disabled={loading || codeCooldown > 0}
                >
                  {codeCooldown > 0 ? `${codeCooldown}s 后重发` : '获取验证码'}
                </button>
              </div>
            </label>
            <button type="submit" disabled={loading}>
              {loading ? '登录中…' : '验证码登录'}
            </button>
          </form>
        )}
        <p className="auth__link">
          新用户？<Link to="/register">去注册</Link>
        </p>
      </div>
    </div>
  );
}
