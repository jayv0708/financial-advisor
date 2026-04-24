import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Target, TrendingUp, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';
import { formatINR } from '../utils/constants';

export default function GoalsPage() {
  const { state, actions } = useApp();
  const user = state.user;
  const [goalInput, setGoalInput] = useState(user?.savingsGoal?.toString() ?? '');
  const [saved, setSaved] = useState(false);

  const totalSavings = (() => {
    const income = user?.income ?? 0;
    const monthlyExpenses = state.expenses.reduce((acc, e) => {
      const d = new Date(e.date);
      if (d.getMonth() === state.selectedMonth && d.getFullYear() === state.selectedYear) {
        return acc + Number(e.amount || 0);
      }
      return acc;
    }, 0);
    return Math.max(income - monthlyExpenses, 0);
  })();

  const savingsGoal = user?.savingsGoal ?? 0;
  const progress = savingsGoal > 0 ? Math.min((totalSavings / savingsGoal) * 100, 100) : 0;

  const handleSave = () => {
    const goal = Number(goalInput);
    actions.setUser({ ...user, savingsGoal: goal > 0 ? goal : null });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>Goals</h1>
          <p className="text-lg text-secondary">Set and track your financial goals</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
          <Profile />
        </div>
      </header>

      <div className="two-col-grid" style={{ alignItems: 'start' }}>
        {/* Set Goal */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Target size={24} color="var(--accent-primary)" />
            <h3 className="text-lg font-serif">Monthly Savings Goal</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Target Amount (₹)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600 }}>₹</span>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 500000"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>
          <button className="btn-primary" onClick={handleSave} style={{ width: '100%' }}>
            {saved ? <><CheckCircle size={18} /> Saved!</> : 'Save Goal'}
          </button>
        </div>

        {/* Progress */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={24} color="var(--accent-primary)" />
            <h3 className="text-lg font-serif">This Month's Progress</h3>
          </div>

          {savingsGoal > 0 ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="text-sm text-secondary">Saved this month</span>
                  <span className="font-semibold">{formatINR(totalSavings)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="text-sm text-secondary">Goal</span>
                  <span className="font-semibold">{formatINR(savingsGoal)}</span>
                </div>
                <div style={{ height: '12px', background: 'var(--card-border)', borderRadius: '6px', overflow: 'hidden', marginTop: '1rem' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? 'var(--success)' : 'var(--accent-primary)', borderRadius: '6px', transition: 'width 0.8s ease' }} />
                </div>
                <p className="text-sm text-secondary" style={{ marginTop: '0.5rem', textAlign: 'right' }}>{Math.round(progress)}% achieved</p>
              </div>

              <div className={`card`} style={{ background: progress >= 100 ? 'var(--success-bg)' : 'var(--accent-light)', border: 'none', padding: '1rem', marginTop: '0.5rem' }}>
                <p className="text-sm" style={{ color: progress >= 100 ? 'var(--success)' : 'var(--accent-primary)' }}>
                  {progress >= 100
                    ? '🎉 Congratulations! You\'ve reached your savings goal this month!'
                    : `${formatINR(savingsGoal - totalSavings)} more to reach your goal this month.`}
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p className="text-secondary">Set a savings goal on the left to track your progress.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
