import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';
import InvestmentAdvisor from '../components/InvestmentAdvisor';

export default function InvestmentsPage() {
  const { state } = useApp();

  return (
    <Layout>
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>Investments</h1>
          <p className="text-lg text-secondary">AI-powered portfolio recommendations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
          <Profile />
        </div>
      </header>
      <InvestmentAdvisor expenses={state.expenses} monthlyIncome={state.user?.income ?? 0} />
    </Layout>
  );
}
