import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { register, sendRegisterCode } from '../api';
import './Auth.css';

const SCHOOL_EMAIL_REGEX = /^p\d{7}@mpu\.edu\.mo$/i;
function isSchoolEmail(em) {
  return typeof em === 'string' && SCHOOL_EMAIL_REGEX.test(em.trim().toLowerCase());
}

export default function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const t = setInterval(() => setCodeCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [codeCooldown]);

  const handleSendCode = async () => {
    const em = email.trim().toLowerCase();
    if (!isSchoolEmail(em)) {
      setError('邮箱须为 P + 7 位数字 + @mpu.edu.mo，如 P1234567@mpu.edu.mo');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await sendRegisterCode(em);
      setCodeCooldown(60);
      setCodeSent(true);
      setError('');
      if (data.devCode) setDevCode(data.devCode);
      if (data.emailError) setEmailError(data.emailError);
      else setEmailError('');
    } catch (err) {
      setError(err.message || '发送失败，请检查网络或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isSchoolEmail(email)) {
      setError('邮箱须为 P + 7 位数字 + @mpu.edu.mo');
      return;
    }
    if (!code.trim()) {
      setError('请填写邮箱验证码');
      return;
    }
    setLoading(true);
    try {
      const data = await register(email.trim().toLowerCase(), code.trim(), nickname.trim(), password);
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
        <p className="auth__site-name">在日落下相遇</p>
        <h1 className="auth__title">注册</h1>
        <form onSubmit={handleSubmit} className="auth__form">
          {error && <p className="auth__error">{error}</p>}
          {codeSent && !error && (
            <p className="auth__success">
              {emailError ? '邮件发送失败，请使用下方验证码：' : '验证码已发送，请查收邮件（含垃圾箱）后填入下方'}
              {devCode && <span className="auth__dev-code">验证码：<strong>{devCode}</strong></span>}
              {emailError && <span className="auth__email-error">（原因：{emailError}）</span>}
            </p>
          )}
          <label>
            <span>邮箱</span>
            <div className="auth__code-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="P1234567@mpu.edu.mo"
                required
                autoComplete="email"
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
          <label className="auth__code-label">
            <span>邮箱验证码（4 位数字）</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              className="auth__code-input"
            />
          </label>
          <label>
            <span>昵称</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              minLength={1}
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
