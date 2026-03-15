import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { login, sendLoginCode, loginWithCode } from '../api';
import './Auth.css';

export default function Login({ onLogin }) {
  const [forgotMode, setForgotMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [emailError, setEmailError] = useState('');
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
    if (!/^p\d{7}@mpu\.edu\.mo$/i.test((email || '').trim())) {
      setError('邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo');
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

  const handleSendCode = async () => {
    const em = email.trim().toLowerCase();
    if (!/^p\d{7}@mpu\.edu\.mo$/i.test((em || '').trim())) {
      setError('邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo');
      return;
    }
    setError('');
    setDevCode('');
    setEmailError('');
    setLoading(true);
    try {
      const data = await sendLoginCode(em);
      setCodeCooldown(60);
      if (data.devCode) setDevCode(data.devCode);
      if (data.emailError) setEmailError(data.emailError);
      else setEmailError('');
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
        <p className="auth__site-name">在日落下相遇</p>
        <h1 className="auth__title">登录</h1>
        {!forgotMode ? (
          <>
            <form onSubmit={handlePasswordSubmit} className="auth__form">
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
            <p className="auth__link auth__link--forgot">
              <button type="button" className="auth__link-btn" onClick={() => { setForgotMode(true); setError(''); setDevCode(''); }}>
                忘记密码？
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="auth__subtitle">通过邮箱验证码登录（忘记密码时使用）</p>
            <form onSubmit={handleCodeSubmit} className="auth__form">
              {error && <p className="auth__error">{error}</p>}
              {devCode && (
                <p className="auth__success">
                  {emailError ? '邮件发送失败，请使用下方验证码：' : '本次验证码：'}
                  <strong>{devCode}</strong>
                  {emailError && <span className="auth__email-error">（原因：{emailError}）</span>}
                </p>
              )}
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
            <p className="auth__link">
              <button type="button" className="auth__link-btn" onClick={() => { setForgotMode(false); setError(''); setCode(''); setDevCode(''); }}>
                返回密码登录
              </button>
            </p>
          </>
        )}
        <p className="auth__link">
          新用户？<Link to="/register">去注册</Link>
        </p>
      </div>
    </div>
  );
}
