import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';

export default function ExpensesPage() {
  const { state, actions } = useApp();

  return (
    <Layout>
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>Expenses</h1>
          <p className="text-lg text-secondary">Track and manage your transactions</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
          <Profile />
        </div>
      </header>

      <div className="two-col-grid" style={{ alignItems: 'flex-start' }}>
        <ExpenseForm
          onAddExpense={actions.addExpense}
          modelReady={state.modelReady}
        />
        <div />
      </div>

      <ExpenseList
        expenses={state.expenses}
        onUpdateExpense={actions.updateExpense}
        onDeleteExpense={actions.deleteExpense}
      />
    </Layout>
  );
}
