import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, ChevronDown } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildYears() {
  const current = new Date().getFullYear();
  return Array.from({ length: 3 }, (_, i) => current - 2 + i); // past 2 years + current
}

export default function DateSelector() {
  const { state, actions } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const years = buildYears();
  const { selectedMonth, selectedYear } = state;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (month, year) => {
    actions.setSelectedDate(month, year);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'white', border: '1px solid var(--card-border)',
          padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <Calendar size={16} color="var(--text-secondary)" />
        <span className="text-sm font-medium">{MONTHS[selectedMonth].slice(0,3)} {selectedYear}</span>
        <ChevronDown size={16} color="var(--text-secondary)" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div className="card" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)',
          zIndex: 100, padding: '1rem', width: '280px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', animation: 'fadeIn 0.2s ease',
        }}>
          {/* Year selector */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            {years.map(y => (
              <button
                key={y}
                onClick={() => handleSelect(selectedMonth, y)}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                  background: y === selectedYear ? 'var(--accent-primary)' : 'var(--accent-light)',
                  color: y === selectedYear ? 'white' : 'var(--text-primary)',
                  border: 'none', fontWeight: 600, fontSize: '0.85rem',
                }}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => handleSelect(i, selectedYear)}
                style={{
                  padding: '0.5rem 0.25rem', borderRadius: '6px', cursor: 'pointer',
                  background: i === selectedMonth && selectedYear === state.selectedYear ? 'var(--accent-primary)' : 'transparent',
                  color: i === selectedMonth && selectedYear === state.selectedYear ? 'white' : 'var(--text-primary)',
                  border: '1px solid transparent',
                  fontSize: '0.8rem', fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!(i === selectedMonth && selectedYear === state.selectedYear)) e.target.style.background = 'var(--accent-light)'; }}
                onMouseLeave={e => { if (!(i === selectedMonth && selectedYear === state.selectedYear)) e.target.style.background = 'transparent'; }}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
