import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSoulQuestions, submitSoulAnswers } from '../api';
import './Home.css';

export default function Soul() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getSoulQuestions()
      .then((d) => setQuestions(d.questions || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, []);

  const total = questions.length;
  const current = questions[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const handleNext = () => {
    if (step < total - 1) setStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const list = questions
      .map((q) => ({ questionId: Number(q.id), answer: String(answers[q.id] ?? '').trim() }))
      .filter((a) => a.answer.length > 0);
    if (list.length === 0) {
      setMsg('请至少回答一题后再提交');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await submitSoulAnswers(list);
      setMsg('已保存，可以回主页进行灵魂共鸣匹配。');
    } catch (err) {
      const message = err?.message || '';
      setMsg(message.includes('401') || message.includes('登录') ? '请重新登录后再提交' : message || '提交失败，请检查网络');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="home">
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>加载中…</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="home">
        <header className="home__header">
          <Link to="/" className="home__back">← 返回</Link>
          <span className="home__title">灵魂共鸣</span>
        </header>
        <main className="home__main">
          <p className="home__error">暂无题目</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <header className="home__header">
        <Link to="/" className="home__back">← 返回</Link>
        <span className="home__title">灵魂共鸣 · {step + 1}/{total}</span>
      </header>
      <main className="home__main" style={{ maxWidth: '32rem', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} className="soul-step__form">
          <div className="home__mode-card soul-step">
            {current && (
              <>
                <p className="soul-step__progress" aria-hidden>
                  第 {step + 1} 题，共 {total} 题
                </p>
                <h2 className="soul-step__question">{current.question}</h2>
                <textarea
                  className="soul-step__textarea"
                  value={answers[current.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
                  rows={4}
                  placeholder="写下你的想法…"
                />
              </>
            )}
          </div>

          <div className="soul-step__nav">
            <button
              type="button"
              className="home__complete-btn soul-step__btn"
              onClick={handlePrev}
              disabled={isFirst}
            >
              上一题
            </button>
            {!isLast ? (
              <button
                type="button"
                className="soul-step__btn soul-step__btn--primary"
                onClick={handleNext}
              >
                下一题
              </button>
            ) : (
              <button
                type="submit"
                className="soul-step__btn soul-step__btn--primary"
                disabled={saving}
              >
                {saving ? '保存中…' : '保存答案'}
              </button>
            )}
          </div>
        </form>

        {msg && <p className="home__error" style={{ marginTop: '1rem' }}>{msg}</p>}
      </main>
    </div>
  );
}
