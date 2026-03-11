import React, { useState, useEffect, useRef } from 'react';
import './DatePicker.css';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDay = first.getDay();
  const daysInMonth = last.getDate();
  const prevMonth = new Date(year, month, 0);
  const prevDays = prevMonth.getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: prevDays - firstDay + i + 1, current: false, date: new Date(year, month - 1, prevDays - firstDay + i + 1) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(year, month, d) });
  }
  const rest = 42 - cells.length;
  for (let i = 0; i < rest; i++) {
    cells.push({ day: i + 1, current: false, date: new Date(year, month + 1, i + 1) });
  }
  return cells;
}

function formatValue(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MIN_YEAR = 1900;

export default function DatePicker({ value, onChange, placeholder = '请选择日期', className = '' }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const ref = useRef(null);
  const maxYear = new Date().getFullYear() + 1;
  const yearOptions = [];
  for (let y = maxYear; y >= MIN_YEAR; y--) yearOptions.push(y);

  const valueDate = value ? (() => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  })() : null;

  useEffect(() => {
    if (value && open) {
      const [y, m] = value.split('-').map(Number);
      setView({ year: y, month: m - 1 });
    }
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const cells = getDaysInMonth(view.year, view.month);

  const prevMonth = () => {
    if (view.month === 0) setView({ year: view.year - 1, month: 11 });
    else setView({ year: view.year, month: view.month - 1 });
  };

  const nextMonth = () => {
    if (view.month === 11) setView({ year: view.year + 1, month: 0 });
    else setView({ year: view.year, month: view.month + 1 });
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value, 10);
    if (!Number.isNaN(y)) setView((v) => ({ ...v, year: y }));
  };

  const handleSelect = (cell) => {
    onChange(formatValue(cell.date));
    setOpen(false);
  };

  const displayText = valueDate
    ? `${valueDate.getFullYear()}年${valueDate.getMonth() + 1}月${valueDate.getDate()}日`
    : placeholder;

  return (
    <div className={`date-picker ${className}`} ref={ref}>
      <button
        type="button"
        className="date-picker__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="date-picker__text">{displayText}</span>
        <span className="date-picker__arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="date-picker__dropdown">
          <div className="date-picker__nav">
            <button type="button" className="date-picker__nav-btn" onClick={prevMonth} aria-label="上一月">
              ‹
            </button>
            <span className="date-picker__nav-title">
              <select
                className="date-picker__year-select"
                value={view.year}
                onChange={handleYearChange}
                aria-label="选择年份"
                title="快捷选择年份"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <span className="date-picker__month-text">{view.month + 1}月</span>
            </span>
            <button type="button" className="date-picker__nav-btn" onClick={nextMonth} aria-label="下一月">
              ›
            </button>
          </div>
          <div className="date-picker__weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="date-picker__weekday">{w}</span>
            ))}
          </div>
          <div className="date-picker__grid">
            {cells.map((cell, i) => {
              const isSelected = value && cell.current && value === formatValue(cell.date);
              const isToday = (() => {
                const t = new Date();
                return cell.current && cell.date.getFullYear() === t.getFullYear() &&
                  cell.date.getMonth() === t.getMonth() && cell.date.getDate() === t.getDate();
              })();
              return (
                <button
                  key={i}
                  type="button"
                  className={`date-picker__day ${!cell.current ? 'date-picker__day--other' : ''} ${isSelected ? 'date-picker__day--selected' : ''} ${isToday ? 'date-picker__day--today' : ''}`}
                  onClick={() => handleSelect(cell)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
