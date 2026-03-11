import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveProfile } from '../api';
import { PROVINCES } from '../data/provinces';
import { DEGREES, getCollegesForDegree, getMajorsForCollege } from '../data/mpu';
import { MBTI_E, MBTI_I, MBTI_UNKNOWN, MBTI_TEST_URL } from '../data/mbti';
import DatePicker from '../components/DatePicker';
import ChinaMapPicker from '../components/ChinaMapPicker';
import './Onboarding.css';

const LONGEST_OPTIONS = ['<1个月', '1-3月', '3-6月', '1年', '2年', '3年', '>3年', '>5年'];
const BUDGET_OPTIONS = [
  'A. 小于3k', 'B. 3k-5k', 'C. 5k-8k', 'D. 8k+', 'E. 1W+',
];

const STEPS = [
  { key: 'degree', title: '现在是什么学位？', type: 'select', options: DEGREES },
  { key: 'college', title: '学院', type: 'select', optionsKey: 'colleges', dependsOn: 'degree' },
  { key: 'major', title: '专业', type: 'select', optionsKey: 'majors', dependsOn: 'college' },
  { key: 'gender', title: '性别', type: 'choice', options: ['男', '女', '其他'] },
  { key: 'preferred_gender', title: '希望匹配的性别', type: 'choice', options: ['男', '女', '不限'] },
  { key: 'birthday', title: '生日', type: 'date' },
  { key: 'mbti', title: 'MBTI', type: 'mbti_group', note: true },
  { key: 'relationship_count', title: '感情经历', type: 'choice', options: ['0段', '半段', '1段', '2段', '3段及以上'] },
  { key: 'longest_relationship', title: '最长一段恋爱的时间', type: 'choice_grid_4', options: LONGEST_OPTIONS, hideWhen: { relationship_count: '0段' } },
  { key: 'purpose', title: '谈恋爱的目的', type: 'choice', options: ['专注当下的快乐', '走向未来的婚姻'] },
  { key: 'cities', title: '毕业3年内打算发展的省份（可多选）', type: 'china_map_multi', showWhen: { purpose: '走向未来的婚姻' } },
  { key: 'monthly_budget', title: '月花销', type: 'budget_grid', options: BUDGET_OPTIONS, showWhen: { purpose: '走向未来的婚姻' } },
  { key: 'hometown_province', title: '家乡所在省份', type: 'china_map', options: PROVINCES },
  { key: 'love_index', title: '想恋爱指数（1～5）', type: 'slider', min: 1, max: 5 },
];

const PLEDGE_TEXT = [
  '爱，是真诚 ---- 我不掩饰我对你的目的、不掩饰我曾经的经历；',
  '爱，是真实 ---- 我渴望你爱卸下胭脂的我、爱完整的全部的我。',
  '我，愿意去了解你，带着善意、带着温柔，希望你，也一样。',
  '用户需要担保，自己对于自己的过去不带有虚构色彩；对于我们的未来，持有希望态度。',
];

export default function Onboarding({ user, onDone }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [pledgeChecked, setPledgeChecked] = useState(false);
  const [showPledge, setShowPledge] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStepConfig = STEPS[step];
  const visibleSteps = STEPS.filter((s) => {
    if (s.hideWhen) {
      const key = Object.keys(s.hideWhen)[0];
      if (form[key] === s.hideWhen[key]) return false;
    }
    if (!s.showWhen) return true;
    const key = Object.keys(s.showWhen)[0];
    return form[key] === s.showWhen[key];
  });
  const currentIndex = visibleSteps.findIndex((s) => s.key === currentStepConfig?.key);
  const current = visibleSteps[currentIndex];

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'degree') setForm((f) => ({ ...f, college: '', major: '' }));
    if (key === 'college') setForm((f) => ({ ...f, major: '' }));
    if (key === 'relationship_count' && value === '0段') setForm((f) => ({ ...f, longest_relationship: '' }));
    setError('');
  };

  const toggleCity = (city) => {
    const list = form[current.key] || [];
    const next = list.includes(city) ? list.filter((c) => c !== city) : [...list, city];
    update(current.key, next);
  };

  const next = () => {
    if (!current) return;
    const v = form[current.key];
    if (current.type !== 'multicity' && current.type !== 'citygrid' && current.type !== 'china_map_multi' && (v === undefined || v === '' || (Array.isArray(v) && v.length === 0))) {
      setError('请完成本题');
      return;
    }
    if ((current.type === 'citygrid' || current.type === 'china_map_multi') && (!Array.isArray(v) || v.length === 0)) {
      setError(current.type === 'china_map_multi' ? '请至少选择一个省份' : '请至少选择一个城市');
      return;
    }
    if (currentIndex < visibleSteps.length - 1) {
      setStep(STEPS.findIndex((s) => s.key === visibleSteps[currentIndex + 1].key));
    } else {
      setShowPledge(true);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setStep(STEPS.findIndex((s) => s.key === visibleSteps[currentIndex - 1].key));
    }
    setError('');
  };

  const submitPledge = async () => {
    if (!pledgeChecked) {
      setError('请勾选确认担保');
      return;
    }
    setShowPledge(false);
    setShowFinal(true);
    setTimeout(() => {
      setLoading(true);
      const profile = {
        ...form,
        cities: form.cities || [],
        love_index: form.love_index != null ? Number(form.love_index) : 3,
      };
      saveProfile(profile)
        .then(() => {
          onDone();
          navigate('/', { replace: true });
        })
        .catch((err) => {
          setError(err.message);
          setShowFinal(false);
        })
        .finally(() => setLoading(false));
    }, 2500);
  };

  if (showFinal) {
    return (
      <div className="onboarding-final">
        <p className="onboarding-final__line">请，绝对，真诚。</p>
        {loading && <p className="onboarding-final__loading">正在保存…</p>}
      </div>
    );
  }

  if (showPledge) {
    return (
      <div className="onboarding-pledge">
        <div className="onboarding-pledge__box">
          <h2>请阅读并确认</h2>
          {PLEDGE_TEXT.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {error && <p className="auth__error">{error}</p>}
          <label className="onboarding-pledge__check">
            <input type="checkbox" checked={pledgeChecked} onChange={(e) => setPledgeChecked(e.target.checked)} />
            <span>我确认以上担保</span>
          </label>
          <button onClick={submitPledge} disabled={!pledgeChecked}>
            确认
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    const firstVisible = visibleSteps[0];
    if (firstVisible) setStep(STEPS.findIndex((s) => s.key === firstVisible.key));
    return null;
  }

  let optionsForSelect = current.options;
  if (current.dependsOn === 'degree' && current.optionsKey === 'colleges') {
    optionsForSelect = getCollegesForDegree(form.degree) || [];
  }
  if (current.dependsOn === 'college' && current.optionsKey === 'majors') {
    optionsForSelect = getMajorsForCollege(form.college, form.degree) || [];
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <div className="onboarding__progress">
          {currentIndex + 1} / {visibleSteps.length}
        </div>
        <h2 className="onboarding__title">{current.title}</h2>
        {current.note && (
          <p className="onboarding__note">
            {current.key === 'mbti' ? (
              <>
                选择「
                <button type="button" className="onboarding__note-link" onClick={() => update(current.key, MBTI_UNKNOWN)}>
                  不知道
                </button>
                」可先跳过，或点击下方链接做免费测试后再选类型。
                <br />
                <a href={MBTI_TEST_URL} target="_blank" rel="noopener noreferrer" className="onboarding__mbti-link">
                  打开免费 MBTI 测试（OpenJung）
                </a>
              </>
            ) : (
              current.note
            )}
          </p>
        )}
        {error && <p className="auth__error">{error}</p>}

        {current.type === 'select' && (
          <select
            value={form[current.key] || ''}
            onChange={(e) => update(current.key, e.target.value)}
            className="onboarding__select"
          >
            <option value="">请选择</option>
            {(optionsForSelect || []).map((opt) => {
              const val = typeof opt === 'object' && opt !== null && 'value' in opt ? opt.value : opt;
              const lab = typeof opt === 'object' && opt !== null && 'label' in opt ? opt.label : opt;
              return <option key={val} value={val}>{lab}</option>;
            })}
          </select>
        )}

        {current.type === 'choice' && (
          <div className="onboarding__choices">
            {current.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={form[current.key] === opt ? 'active' : ''}
                onClick={() => update(current.key, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {current.type === 'choice_grid_4' && (
          <div className="onboarding__grid-4">
            {current.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={form[current.key] === opt ? 'active' : ''}
                onClick={() => update(current.key, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {current.type === 'date' && (
          <DatePicker
            value={form[current.key] || ''}
            onChange={(v) => update(current.key, v)}
            placeholder="点击选择生日日期"
            className="onboarding__date-picker"
          />
        )}

        {current.type === 'mbti_group' && (
          <div className="onboarding__mbti">
            <div className="onboarding__mbti-group">
              <span className="onboarding__mbti-label">E 人</span>
              <div className="onboarding__mbti-grid">
                {MBTI_E.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={form[current.key] === opt ? 'active' : ''}
                    onClick={() => update(current.key, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="onboarding__mbti-group">
              <span className="onboarding__mbti-label">I 人</span>
              <div className="onboarding__mbti-grid">
                {MBTI_I.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={form[current.key] === opt ? 'active' : ''}
                    onClick={() => update(current.key, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {current.type === 'china_map' && (
          <ChinaMapPicker
            value={form[current.key] || ''}
            onChange={(v) => update(current.key, v)}
            title="点击地图选择家乡所在省份"
          />
        )}

        {current.type === 'china_map_multi' && (
          <ChinaMapPicker
            multiple
            value={form[current.key] || []}
            onChange={(v) => update(current.key, v)}
            title="点击地图上的省份多选，再点可取消"
          />
        )}

        {current.type === 'budget_grid' && (
          <div className="onboarding__budget_grid">
            <div className="onboarding__budget_row">
              {(current.options || []).slice(0, 3).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={form[current.key] === opt ? 'active' : ''}
                  onClick={() => update(current.key, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="onboarding__budget_row">
              {(current.options || []).slice(3, 5).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={form[current.key] === opt ? 'active' : ''}
                  onClick={() => update(current.key, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {current.type === 'slider' && (
          <div className="onboarding__slider-wrap">
            <input
              type="range"
              min={current.min ?? 1}
              max={current.max ?? 5}
              value={form[current.key] ?? 3}
              onChange={(e) => update(current.key, parseInt(e.target.value, 10))}
              className="onboarding__slider"
            />
            <span className="onboarding__slider-value">{form[current.key] ?? 3}</span>
          </div>
        )}

        <div className="onboarding__nav">
          <button type="button" onClick={prev} disabled={currentIndex === 0}>
            上一题
          </button>
          <button type="button" onClick={next}>
            {currentIndex === visibleSteps.length - 1 ? '完成' : '下一题'}
          </button>
        </div>
      </div>
    </div>
  );
}
