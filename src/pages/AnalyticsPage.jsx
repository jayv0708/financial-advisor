import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';
import DateSelector from '../components/DateSelector';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { CATEGORY_COLORS, formatINR } from '../utils/constants';

export default function AnalyticsPage() {
  const { state } = useApp();
  const { expenses, selectedMonth, selectedYear } = state;

  const filtered = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const categoryTotals = filtered.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Daily spending bar chart
  const dailyMap = filtered.reduce((acc, exp) => {
    const day = new Date(exp.date).getDate();
    acc[day] = (acc[day] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    amount: dailyMap[i + 1] || 0,
  }));

  return (
    <Layout>
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>Analytics</h1>
          <p className="text-lg text-secondary">Deep insights into your spending patterns</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
            <Profile />
          </div>
          <DateSelector />
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p className="text-secondary">No expenses found for this period.</p>
        </div>
      ) : (
        <>
          <div className="two-col-grid">
            <div className="card">
              <h3 className="text-lg font-serif" style={{ marginBottom: '1.5rem' }}>Category Breakdown</h3>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#999'} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: 'white', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-serif" style={{ marginBottom: '1.5rem' }}>Category Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pieData.map((item, i) => {
                  const total = pieData.reduce((s, p) => s + p.value, 0);
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: CATEGORY_COLORS[item.name] || '#999' }} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm text-secondary">{formatINR(item.value)} · {pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--card-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: CATEGORY_COLORS[item.name] || 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 className="text-lg font-serif" style={{ marginBottom: '1.5rem' }}>Daily Spending</h3>
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={v => `₹${v / 1000}k`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: 'white', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                  <Bar dataKey="amount" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
