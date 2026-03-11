import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { saveProfile } from '../api';
import { getDegreeDisplay, getCollegeDisplay, DEGREES, getCollegesForDegree, getMajorsForCollege } from '../data/mpu';
import { MBTI_E, MBTI_I, MBTI_UNKNOWN, MBTI_TEST_URL } from '../data/mbti';
import DatePicker from '../components/DatePicker';
import ChinaMapPicker from '../components/ChinaMapPicker';
import './Profile.css';

const LONGEST_OPTIONS = ['<1个月', '1-3月', '3-6月', '1年', '2年', '3年', '>3年', '>5年'];
const BUDGET_OPTIONS = ['A. 小于3k', 'B. 3k-5k', 'C. 5k-8k', 'D. 8k+', 'E. 1W+'];
const RELATIONSHIP_OPTIONS = ['0段', '半段', '1段', '2段', '3段及以上'];
const PURPOSE_OPTIONS = ['专注当下的快乐', '走向未来的婚姻'];
const GENDER_OPTIONS = ['男', '女', '其他'];
const MAX_PHOTOS = 3;

function showValue(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join('、') : '—';
  return String(v);
}

function parsePhotos(photos) {
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    try {
      const arr = JSON.parse(photos);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function Profile({ user, onLogout, refreshUser }) {
  const p = user?.profile || {};
  const cities = typeof p.cities === 'string' ? (() => { try { return JSON.parse(p.cities); } catch { return []; } })() : (p.cities || []);
  const [editing, setEditing] = useState(false);
  const [intro, setIntro] = useState(p.intro || '');
  const [photos, setPhotos] = useState(() => parsePhotos(p.photos));
  const [avatar, setAvatar] = useState(p.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editArchive, setEditArchive] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    setIntro(p.intro || '');
    setPhotos(parsePhotos(p.photos));
    setAvatar(p.avatar || '');
  }, [p.intro, p.photos, p.avatar]);

  const degreeDisplay = (p?.degree != null && p.degree !== '') ? getDegreeDisplay(p.degree) : '—';
  const basicItems = [
    { label: '学位', value: degreeDisplay },
    { label: '性别', value: p.gender },
    { label: '学院', value: getCollegeDisplay(p.college) },
    { label: '专业', value: p.major },
    { label: '生日', value: p.birthday },
  ];
  const loveItems = [
    { label: '希望匹配的性别', value: p.preferred_gender ?? '—' },
    { label: 'MBTI', value: p.mbti },
    { label: '感情经历', value: p.relationship_count },
    { label: '最长一段恋爱时间', value: p.longest_relationship },
    { label: '谈恋爱的目的', value: p.purpose },
    { label: '想恋爱指数', value: p.love_index != null ? `${p.love_index} / 5` : '—' },
  ];
  const placeItems = [
    { label: '发展的省份', value: Array.isArray(cities) ? cities.join('、') : showValue(cities) },
    { label: '月花销', value: p.monthly_budget },
    { label: '家乡省份', value: p.hometown_province },
  ];

  const handleSaveIntro = async () => {
    setError('');
    setSaving(true);
    try {
      await saveProfile({ ...p, intro: intro.trim(), cities, photos, avatar: avatar || p.avatar });
      setEditing(false);
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      saveProfile({ ...p, intro: p.intro, cities, photos: parsePhotos(p.photos), avatar: dataUrl }).then(() => refreshUser?.()).catch(() => {});
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePhotoAdd = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const next = [...photos];
    for (let i = 0; i < files.length && next.length < MAX_PHOTOS; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => {
          const n = [...prev, reader.result].slice(0, MAX_PHOTOS);
          saveProfile({ ...p, intro: p.intro, cities, photos: n, avatar: p.avatar }).then(() => refreshUser?.()).catch(() => {});
          return n;
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handlePhotoRemove = (index) => {
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    saveProfile({ ...p, intro: p.intro, cities, photos: next, avatar: p.avatar }).then(() => refreshUser?.()).catch(() => {});
  };

  const PREFERRED_GENDER_OPTIONS = ['男', '女', '不限'];

  const startEditArchive = () => {
    setForm({
      degree: p.degree || '',
      college: p.college || '',
      major: p.major || '',
      gender: p.gender || '',
      preferred_gender: p.preferred_gender || '',
      birthday: p.birthday || '',
      mbti: p.mbti || '',
      relationship_count: p.relationship_count || '',
      longest_relationship: p.longest_relationship || '',
      purpose: p.purpose || '',
      cities: Array.isArray(cities) ? cities : [],
      monthly_budget: p.monthly_budget || '',
      hometown_province: p.hometown_province || '',
      love_index: p.love_index != null ? p.love_index : 3,
    });
    setEditArchive(true);
    setError('');
  };

  const handleSaveArchive = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        degree: form.degree || null,
        college: form.college || null,
        major: form.major || null,
        gender: form.gender || null,
        preferred_gender: form.preferred_gender || null,
        birthday: form.birthday || null,
        mbti: form.mbti || null,
        relationship_count: form.relationship_count || null,
        longest_relationship: form.longest_relationship || null,
        purpose: form.purpose || null,
        cities: form.cities,
        monthly_budget: form.monthly_budget || null,
        hometown_province: form.hometown_province || null,
        love_index: form.love_index != null ? form.love_index : null,
        intro: p.intro,
        photos: parsePhotos(p.photos),
        avatar: p.avatar,
      };
      await saveProfile(payload);
      setEditArchive(false);
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const colleges = getCollegesForDegree(form.degree || p.degree);
  const collegeOptions = colleges.map((c) => (typeof c === 'object' && c?.value != null ? c.value : c));
  const majors = getMajorsForCollege(form.college || p.college, form.degree || p.degree);

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <span className="profile-page__brand">在日落下相遇</span>
        <nav className="profile-page__nav">
          <Link to="/">返回主页</Link>
          <button type="button" className="profile-page__logout" onClick={onLogout}>
            退出
          </button>
        </nav>
      </header>

      <main className="profile-page__main">
        <section className="profile-page__hero">
          <label className="profile-page__avatar-wrap" title="点击上传头像">
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="profile-page__avatar-input" />
            {avatar ? (
              <img src={avatar} alt="" className="profile-page__avatar-img" />
            ) : (
              <span className="profile-page__avatar-placeholder">头像</span>
            )}
            <span className="profile-page__avatar-hint">点击更换</span>
          </label>
          <h1 className="profile-page__name">{user?.nickname}</h1>
          <p className="profile-page__email">{user?.email}</p>
        </section>

        <div className="profile-page__content">
        <section className="profile-page__card profile-page__intro-card">
          <h2>个人简介与照片</h2>
          <div className="profile-page__photos">
            {photos.map((src, i) => (
              <div key={i} className="profile-page__photo-wrap">
                <img src={src} alt="" />
                <button type="button" className="profile-page__photo-remove" onClick={() => handlePhotoRemove(i)} aria-label="删除">×</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="profile-page__photo-add">
                <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} />
                上传照片
              </label>
            )}
          </div>
          {editing ? (
            <>
              <textarea
                className="profile-page__intro-edit"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="写一段个人介绍，让更多人了解你…"
                rows={5}
              />
              {error && <p className="profile-page__error">{error}</p>}
              <div className="profile-page__edit-actions">
                <button type="button" onClick={() => { setEditing(false); setIntro(p.intro || ''); setError(''); }}>
                  取消
                </button>
                <button type="button" onClick={handleSaveIntro} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="profile-page__intro-text">
                {p.intro ? p.intro : '暂无个人简介，点击下方按钮添加。'}
              </p>
              <button type="button" className="profile-page__edit-btn" onClick={() => { setIntro(p.intro || ''); setEditing(true); }}>
                编辑个人简介
              </button>
            </>
          )}
        </section>

        <section className="profile-page__card profile-page__archive">
          <h2 className="profile-page__archive-title">
            个人档案
            {!editArchive && (
              <button type="button" className="profile-page__archive-edit-btn" onClick={startEditArchive}>
                编辑档案
              </button>
            )}
          </h2>

          {editArchive ? (
            <div className="profile-page__archive-form">
              <div className="profile-page__form-row">
                <label>学位</label>
                <select value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value, college: '', major: '' })}>
                  <option value="">请选择</option>
                  {DEGREES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="profile-page__form-row">
                <label>学院</label>
                <select value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value, major: '' })}>
                  <option value="">请选择</option>
                  {collegeOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="profile-page__form-row">
                <label>专业</label>
                <select value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })}>
                  <option value="">请选择</option>
                  {(majors || []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="profile-page__form-row">
                <label>性别</label>
                <div className="profile-page__choices">
                  {GENDER_OPTIONS.map((g) => (
                    <button key={g} type="button" className={`profile-page__choice-btn ${form.gender === g ? 'active' : ''}`} onClick={() => setForm({ ...form, gender: g })}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="profile-page__form-row">
                <label>希望匹配的性别</label>
                <div className="profile-page__choices">
                  {PREFERRED_GENDER_OPTIONS.map((g) => (
                    <button key={g} type="button" className={`profile-page__choice-btn ${form.preferred_gender === g ? 'active' : ''}`} onClick={() => setForm({ ...form, preferred_gender: g })}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="profile-page__form-row">
                <label>生日</label>
                <DatePicker value={form.birthday} onChange={(v) => setForm({ ...form, birthday: v })} placeholder="选择日期" />
              </div>
              <div className="profile-page__form-row">
                <label>MBTI</label>
                <div className="profile-page__mbti">
                  <div className="profile-page__mbti-group">
                    <span className="profile-page__mbti-label">E 人</span>
                    <div className="profile-page__choices">
                      {MBTI_E.map((opt) => (
                        <button key={opt} type="button" className={`profile-page__choice-btn ${form.mbti === opt ? 'active' : ''}`} onClick={() => setForm({ ...form, mbti: opt })}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div className="profile-page__mbti-group">
                    <span className="profile-page__mbti-label">I 人</span>
                    <div className="profile-page__choices">
                      {MBTI_I.map((opt) => (
                        <button key={opt} type="button" className={`profile-page__choice-btn ${form.mbti === opt ? 'active' : ''}`} onClick={() => setForm({ ...form, mbti: opt })}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <p className="profile-page__mbti-note">
                    暂不确定？选择「<a href="#" className="profile-page__mbti-link" onClick={(e) => { e.preventDefault(); setForm({ ...form, mbti: MBTI_UNKNOWN }); }}>不知道</a>」或前往{' '}
                    <a href={MBTI_TEST_URL} target="_blank" rel="noopener noreferrer" className="profile-page__mbti-link">免费 MBTI 测试</a>。
                  </p>
                </div>
              </div>
              <div className="profile-page__form-row">
                <label>感情经历</label>
                <div className="profile-page__choices">
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <button key={r} type="button" className={`profile-page__choice-btn ${form.relationship_count === r ? 'active' : ''}`} onClick={() => setForm({ ...form, relationship_count: r })}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="profile-page__form-row">
                <label>最长一段恋爱时间</label>
                <div className="profile-page__choices">
                  {LONGEST_OPTIONS.map((o) => (
                    <button key={o} type="button" className={`profile-page__choice-btn ${form.longest_relationship === o ? 'active' : ''}`} onClick={() => setForm({ ...form, longest_relationship: o })}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="profile-page__form-row">
                <label>谈恋爱的目的</label>
                <div className="profile-page__choices">
                  {PURPOSE_OPTIONS.map((o) => (
                    <button key={o} type="button" className={`profile-page__choice-btn ${form.purpose === o ? 'active' : ''}`} onClick={() => setForm({ ...form, purpose: o })}>{o}</button>
                  ))}
                </div>
              </div>
              {form.purpose === '走向未来的婚姻' && (
                <>
                  <div className="profile-page__form-row">
                    <label>发展的省份（可多选）</label>
                    <ChinaMapPicker multiple value={form.cities} onChange={(v) => setForm({ ...form, cities: v })} title="" />
                  </div>
                  <div className="profile-page__form-row">
                    <label>月花销</label>
                    <div className="profile-page__choices">
                      {BUDGET_OPTIONS.map((o) => (
                        <button key={o} type="button" className={`profile-page__choice-btn ${form.monthly_budget === o ? 'active' : ''}`} onClick={() => setForm({ ...form, monthly_budget: o })}>{o}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="profile-page__form-row">
                <label>家乡省份</label>
                <ChinaMapPicker value={form.hometown_province} onChange={(v) => setForm({ ...form, hometown_province: v })} title="" />
              </div>
              <div className="profile-page__form-row">
                <label>想恋爱指数（1～5）</label>
                <div className="profile-page__choices">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" className={`profile-page__choice-btn ${form.love_index === n ? 'active' : ''}`} onClick={() => setForm({ ...form, love_index: n })}>{n}</button>
                  ))}
                </div>
              </div>
              {error && <p className="profile-page__error">{error}</p>}
              <div className="profile-page__form-actions">
                <button type="button" onClick={() => setEditArchive(false)}>取消</button>
                <button type="button" onClick={handleSaveArchive} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-page__block">
                <h3 className="profile-page__block-head">基本信息</h3>
                <ul className="profile-page__list">
                  {basicItems.map(({ label, value }) => (
                    <li key={label} className="profile-page__item">
                      <span className="profile-page__item-label">{label}</span>
                      <span className="profile-page__item-value">{showValue(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="profile-page__block">
                <h3 className="profile-page__block-head">性格与恋爱</h3>
                <ul className="profile-page__list">
                  {loveItems.map(({ label, value }) => (
                    <li key={label} className="profile-page__item">
                      <span className="profile-page__item-label">{label}</span>
                      <span className="profile-page__item-value">{showValue(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="profile-page__block">
                <h3 className="profile-page__block-head">地域与生活</h3>
                <ul className="profile-page__list">
                  {placeItems.map(({ label, value }) => (
                    <li key={label} className="profile-page__item">
                      <span className="profile-page__item-label">{label}</span>
                      <span className="profile-page__item-value">{showValue(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
