import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowRight, User, Wallet, Shield, Target } from 'lucide-react';

const steps = ['Welcome', 'Income', 'Preferences'];

export default function WelcomePage() {
  const { actions } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    income: '',
    riskLevel: 'Medium',
    savingsGoal: '',
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = () => {
    if (step === 0 && !form.name.trim()) {
      setErrors({ name: 'Please enter your name' });
      return false;
    }
    if (step === 1 && (!form.income || Number(form.income) <= 0)) {
      setErrors({ income: 'Please enter a valid monthly income' });
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = () => {
    const user = {
      name: form.name.trim(),
      income: Number(form.income),
      riskLevel: form.riskLevel,
      savingsGoal: form.savingsGoal ? Number(form.savingsGoal) : null,
    };
    actions.setUser(user);
    navigate('/dashboard');
  };

  const getInitials = (name) => {
    return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--main-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem', justifyContent: 'center' }}>
          <img
            src="/logo.png"
            alt="Intelligent Expense Advisor"
            className="app-logo"
            style={{ width: '52px', height: '52px', objectFit: 'contain' }}
          />
          <div>
            <h1 className="font-serif text-2xl" style={{ lineHeight: 1.1, color: 'var(--accent-primary)' }}>Intelligent</h1>
            <p className="text-sm font-sans text-secondary font-medium">Expense Advisor</p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i <= step ? 'var(--accent-primary)' : 'var(--card-border)',
                color: i <= step ? 'white' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: 600,
                transition: 'all 0.3s ease',
              }}>
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: i < step ? 'var(--accent-primary)' : 'var(--card-border)', maxWidth: '60px', transition: 'all 0.3s ease' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2.5rem', animation: 'fadeIn 0.4s ease' }}>

          {/* Step 0 — Name */}
          {step === 0 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className="circle-icon" style={{ width: '64px', height: '64px', background: 'var(--accent-light)', margin: '0 auto 1rem', fontSize: '2rem' }}>
                  <User size={28} color="var(--accent-primary)" />
                </div>
                <h2 className="text-2xl font-serif" style={{ marginBottom: '0.5rem' }}>Welcome!</h2>
                <p className="text-secondary text-sm">Let's personalise your financial advisor.</p>
              </div>
              <div className="form-group">
                <label className="form-label">What's your name?</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Jay, Rahul Sharma..."
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                  autoFocus
                />
                {errors.name && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.name}</p>}
              </div>
              {form.name && (
                <div style={{ background: 'var(--accent-light)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                    {getInitials(form.name)}
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>Hi, {form.name.trim().split(' ')[0]}! 👋 Great to meet you.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 1 — Income */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className="circle-icon" style={{ width: '64px', height: '64px', background: 'var(--accent-light)', margin: '0 auto 1rem' }}>
                  <Wallet size={28} color="var(--accent-primary)" />
                </div>
                <h2 className="text-2xl font-serif" style={{ marginBottom: '0.5rem' }}>Your Monthly Income</h2>
                <p className="text-secondary text-sm">Used to calculate your savings rate and health score.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Income (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>₹</span>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="50000"
                    value={form.income}
                    onChange={e => update('income', e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                    onKeyDown={e => e.key === 'Enter' && next()}
                    autoFocus
                  />
                </div>
                {errors.income && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors.income}</p>}
              </div>
              <p className="text-xs text-secondary" style={{ marginTop: '0.5rem' }}>
                This stays on your device only. We don't collect any personal data.
              </p>
            </div>
          )}

          {/* Step 2 — Preferences */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className="circle-icon" style={{ width: '64px', height: '64px', background: 'var(--accent-light)', margin: '0 auto 1rem' }}>
                  <Shield size={28} color="var(--accent-primary)" />
                </div>
                <h2 className="text-2xl font-serif" style={{ marginBottom: '0.5rem' }}>Risk Preference</h2>
                <p className="text-secondary text-sm">How do you feel about investment risk?</p>
              </div>

              <div className="form-group">
                <label className="form-label">Risk Tolerance</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {[
                    { value: 'Low', label: 'Conservative', desc: 'Safety first' },
                    { value: 'Medium', label: 'Balanced', desc: 'Steady growth' },
                    { value: 'High', label: 'Aggressive', desc: 'Max returns' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => update('riskLevel', opt.value)}
                      style={{
                        padding: '1rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: `2px solid ${form.riskLevel === opt.value ? 'var(--accent-primary)' : 'var(--card-border)'}`,
                        background: form.riskLevel === opt.value ? 'var(--accent-light)' : 'white',
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={16} />
                  Savings Goal (₹) <span className="text-secondary font-medium">(Optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>₹</span>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 500000"
                    value={form.savingsGoal}
                    onChange={e => update('savingsGoal', e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <button className="btn-primary" onClick={next} style={{ width: '100%', marginTop: '2rem', padding: '0.9rem', fontSize: '1rem' }}>
            {step < steps.length - 1 ? (
              <><span>Continue</span><ArrowRight size={18} /></>
            ) : (
              <><span>Let's Go!</span><ArrowRight size={18} /></>
            )}
          </button>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ← Back
            </button>
          )}
        </div>

        <p className="text-xs text-secondary" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          All data is stored locally on your device. No account required.
        </p>
      </div>
    </div>
  );
}
