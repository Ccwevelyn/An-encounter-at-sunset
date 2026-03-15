import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSoulQuestions, submitSoulAnswers } from '../api';
import './Home.css';

export default function Soul() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getSoulQuestions()
      .then((d) => setQuestions(d.questions || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const list = questions.map((q) => ({ questionId: q.id, answer: answers[q.id]?.trim() || '' })).filter((a) => a.answer);
    if (list.length === 0) {
      setMsg('请至少回答一题');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await submitSoulAnswers(list);
      setMsg('已保存，可以回主页进行灵魂共鸣匹配。');
    } catch (err) {
      setMsg(err.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="home">
        <p style={{ padding: '2rem', textAlign: 'center' }}>加载中…</p>
      </div>
    );
  }

  return (
    <div className="home">
      <header className="home__header">
        <Link to="/" className="home__back">← 返回</Link>
        <span className="home__title">灵魂共鸣 · 主观题</span>
      </header>
      <main className="home__main" style={{ maxWidth: '32rem', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          用文字写下你的想法，我们会据此为你找到想法更接近的人（后续可接 AI 分析）。
        </p>
        <form onSubmit={handleSubmit}>
          {questions.map((q) => (
            <label key={q.id} style={{ display: 'block', marginBottom: '1.25rem' }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>{q.question}</span>
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border)' }}
                placeholder="写下你的想法…"
              />
            </label>
          ))}
          {msg && <p className="home__error" style={{ marginBottom: '0.5rem' }}>{msg}</p>}
          <button type="submit" disabled={saving} className="home__complete-btn">
            {saving ? '保存中…' : '保存主观题答案'}
          </button>
        </form>
      </main>
    </div>
  );
}
