import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';
import DateSelector from '../components/DateSelector';
import Dashboard from '../components/Dashboard';

export default function DashboardPage() {
  const { state, actions } = useApp();

  // Initialise ML model once
  useEffect(() => {
    if (!state.modelReady) {
      import('../ml-model/categorizer').then(({ initModel }) => {
        initModel().catch(console.error).finally(() => actions.setModelReady(true));
      });
    }
  }, []);

  return (
    <Layout>
      {/* Page header */}
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Financial Overview</h1>
          <p className="text-lg text-secondary">Your complete financial snapshot</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
            <Profile />
          </div>
          <DateSelector />
        </div>
      </header>

      <Dashboard
        expenses={state.expenses}
        monthlyIncome={state.user?.income ?? 0}
        onUpdateIncome={(income) => actions.setUser({ ...state.user, income })}
        selectedMonth={state.selectedMonth}
        selectedYear={state.selectedYear}
      />
    </Layout>
  );
}
