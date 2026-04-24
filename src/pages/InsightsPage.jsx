import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';
import InsightCards from '../components/InsightCards';

export default function InsightsPage() {
  const { state } = useApp();

  return (
    <Layout>
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>Insights</h1>
          <p className="text-lg text-secondary">AI-generated financial recommendations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
          <Profile />
        </div>
      </header>

      {state.insights.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p className="text-secondary">Add some expenses to generate personalised insights.</p>
        </div>
      ) : (
        <InsightCards insights={state.insights} />
      )}
    </Layout>
  );
}
