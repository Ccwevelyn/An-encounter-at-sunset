import React, { useState, useEffect } from 'react';
import './Splash.css';

export default function Splash({ onFinish, onSkipForever }) {
  const [phase, setPhase] = useState(0);
  const [skipForever, setSkipForever] = useState(false);

  useEffect(() => {
    if (phase >= 1) return;
    const t = setTimeout(() => setPhase(1), 3200);
    return () => clearTimeout(t);
  }, [phase]);

  const handleEnter = () => {
    if (skipForever) onSkipForever();
    else onFinish();
  };

  return (
    <div className="splash">
      <div className="splash__bg" />
      <div className="splash__center">
        {/* 两个白点相向而行，碰到后停在中间不再分开 */}
        <div className="splash__dots">
          <span className="splash__dot splash__dot--left" />
          <span className="splash__dot splash__dot--right" />
        </div>
        {/* 文字出现后一直保留在页面中 */}
        <div className="splash__quote-wrap">
          {phase >= 1 && (
            <p className="splash__quote">
              Sunset whispers 'forever,' and that's what our love is.
            </p>
          )}
        </div>
      </div>
      <div className="splash__actions">
        <label className="splash__checkbox">
          <input type="checkbox" checked={skipForever} onChange={(e) => setSkipForever(e.target.checked)} />
          <span>以后不再查看</span>
        </label>
        <button className="splash__skip" onClick={handleEnter}>
          {phase >= 1 ? '进入' : '跳过'}
        </button>
      </div>
    </div>
  );
}
