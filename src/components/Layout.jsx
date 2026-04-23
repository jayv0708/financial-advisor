import React from 'react';
import { Activity, PieChart, CreditCard, BrainCircuit } from 'lucide-react';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <BrainCircuit size={32} color="var(--accent-primary)" />
            <h2 className="text-xl font-bold" style={{ lineHeight: 1.2 }}>
              Intelligent<br/>
              <span className="text-secondary text-sm">Expense Advisor</span>
            </h2>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="insight-card info" style={{ padding: '0.75rem', cursor: 'pointer', margin: 0, opacity: 0.9 }}>
              <PieChart size={20} />
              <span className="font-medium">Dashboard</span>
            </div>
            {/* Additional nav items could go here */}
          </nav>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="card" style={{ padding: '1rem', background: 'rgba(155, 89, 182, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Activity size={18} color="var(--accent-primary)" />
              <span className="font-semibold text-sm">ML Engine Status</span>
            </div>
            <p className="text-xs text-secondary">
              TensorFlow.js is running natively in your browser. All data stays local.
            </p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
