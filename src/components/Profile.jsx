import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { clearUser } from '../utils/storage';
import { useNavigate } from 'react-router-dom';

function getInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

export default function Profile() {
  const { state, actions } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(state.user?.name ?? '');
  const dropdownRef = useRef(null);

  const name = state.user?.name ?? 'User';
  const initials = getInitials(name);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      actions.setUser({ ...state.user, name: nameInput.trim() });
    }
    setEditing(false);
  };

  const handleLogout = () => {
    clearUser();
    actions.setUser(null);
    navigate('/');
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--accent-primary)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.95rem', flexShrink: 0,
        }}>
          {initials}
        </div>
        <span className="font-medium" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{name.split(' ')[0]}</span>
        <ChevronDown size={16} color="var(--text-secondary)" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div className="card" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 0.75rem)',
          width: '240px', zIndex: 100, padding: '1rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--card-border)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <p className="font-semibold text-sm">{name}</p>
              <p className="text-xs text-secondary">₹{(state.user?.income ?? 0).toLocaleString('en-IN')}/mo</p>
            </div>
          </div>

          {editing ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                autoFocus
                type="text"
                className="input-field"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" style={{ flex: 1, padding: '0.4rem' }} onClick={handleSaveName}>Save</button>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '0.4rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditing(true); setNameInput(name); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', marginBottom: '0.25rem' }}
            >
              <User size={16} />
              <span className="text-sm">Edit Name</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
          >
            <LogOut size={16} />
            <span className="text-sm">Reset & Start Over</span>
          </button>
        </div>
      )}
    </div>
  );
}
