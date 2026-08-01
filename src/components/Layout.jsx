import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, List, PieChart, TrendingUp, Target, Lightbulb, Settings, Quote, Brain } from 'lucide-react';
import Profile from './Profile';
import DateSelector from './DateSelector';

const navItems = [
  { to: '/dashboard',   icon: Home,        label: 'Dashboard' },
  { to: '/expenses',    icon: List,         label: 'Expenses' },
  { to: '/analytics',   icon: PieChart,     label: 'Analytics' },
  { to: '/investments', icon: TrendingUp,   label: 'Investments' },
  { to: '/goals',       icon: Target,       label: 'Goals' },
  { to: '/insights',    icon: Lightbulb,    label: 'Insights' },
  { to: '/ml-hub',      icon: Brain,        label: 'ML Hub' },
  { to: '/settings',    icon: Settings,     label: 'Settings' },
];

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ marginBottom: '3rem', paddingLeft: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/logo.png"
              alt="Intelligent Expense Advisor"
              className="app-logo"
              style={{ width: '44px', height: '44px', objectFit: 'contain' }}
            />
            <h1 className="text-2xl font-serif" style={{ lineHeight: 1.1 }}>
              Intelligent<br/>
              <span className="text-secondary font-sans font-medium" style={{ fontSize: '1rem' }}>Expense Advisor</span>
            </h1>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `btn-nav${isActive ? ' active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quote box */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ background: 'var(--accent-light)', borderRadius: '12px', padding: '1.5rem' }}>
            <Quote size={24} color="var(--accent-primary)" style={{ marginBottom: '1rem', fill: 'var(--accent-primary)' }} />
            <p className="font-serif text-sm" style={{ fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              A budget is telling your money where to go instead of wondering where it went.
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
              — Dave Ramsey
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export { Profile, DateSelector };
export default Layout;
