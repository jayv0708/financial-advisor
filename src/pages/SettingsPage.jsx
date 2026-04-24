import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';

const RISK_OPTIONS = [
  { value: 'Low', label: 'Conservative', desc: 'Prioritise safety and stable returns.' },
  { value: 'Medium', label: 'Balanced', desc: 'Mix of growth and security.' },
  { value: 'High', label: 'Aggressive', desc: 'Maximise long-term growth potential.' },
];

export default function SettingsPage() {
  const { state, actions } = useApp();
  const user = state.user;
  const [form, setForm] = useState({
    name: user?.name ?? '',
    income: user?.income?.toString() ?? '',
    riskLevel: user?.riskLevel ?? 'Medium',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    actions.setUser({
      ...user,
      name: form.name.trim() || user?.name,
      income: Number(form.income) || user?.income,
      riskLevel: form.riskLevel,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>Settings</h1>
          <p className="text-lg text-secondary">Update your profile and preferences</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
          <Profile />
        </div>
      </header>

      <div style={{ maxWidth: '560px' }}>
        <div className="card">
          <h3 className="text-lg font-serif" style={{ marginBottom: '1.5rem' }}>Profile</h3>

          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input type="text" className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Monthly Income (₹)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600 }}>₹</span>
              <input type="number" className="input-field" value={form.income} onChange={e => setForm(f => ({ ...f, income: e.target.value }))} style={{ paddingLeft: '2.25rem' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Risk Tolerance</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.25rem' }}>
              {RISK_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setForm(f => ({ ...f, riskLevel: opt.value }))}
                  style={{
                    padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${form.riskLevel === opt.value ? 'var(--accent-primary)' : 'var(--card-border)'}`,
                    background: form.riskLevel === opt.value ? 'var(--accent-light)' : 'white',
                    transition: 'all 0.2s ease',
                  }}>
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={handleSave} style={{ width: '100%', marginTop: '0.5rem' }}>
            {saved ? <><CheckCircle size={18} /> Saved!</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
