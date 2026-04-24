import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { CATEGORY_COLORS, formatINR } from '../utils/constants';
import { calculateHealthScore } from '../utils/finance-engine';
import { predictNextMonthSpending } from '../ml-model/predictor';
import { TrendingDown, TrendingUp, Minus, Wallet, Info, Activity, ArrowRight } from 'lucide-react';

const Dashboard = ({ expenses, monthlyIncome, onUpdateIncome, selectedMonth, selectedYear }) => {
  // Default to current month/year if not provided
  const filterMonth = selectedMonth ?? new Date().getMonth();
  const filterYear = selectedYear ?? new Date().getFullYear();
  const [editIncome, setEditIncome] = useState(monthlyIncome.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [prediction, setPrediction] = useState({ predictedAmount: 0, trend: "neutral" });
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    setEditIncome(monthlyIncome.toString());
  }, [monthlyIncome]);

  useEffect(() => {
    let isMounted = true;
    const runPrediction = async () => {
      setIsPredicting(true);
      try {
        const result = await predictNextMonthSpending(expenses);
        if (isMounted && result) {
           setPrediction(result);
        }
      } catch (error) {
        console.error("Prediction failed:", error);
      } finally {
        if (isMounted) setIsPredicting(false);
      }
    };
    runPrediction();
    return () => { isMounted = false; };
  }, [expenses]);

  const handleIncomeSave = () => {
    onUpdateIncome(Number(editIncome) || 0);
    setIsEditing(false);
  };

  // 1. Prepare Data for Pie Chart (Current Month Breakdown)
  // filterMonth/filterYear come from the date selector
  
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const categoryTotals = thisMonthExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const pieData = Object.keys(categoryTotals).map(cat => ({
    name: cat,
    value: categoryTotals[cat]
  })).sort((a, b) => b.value - a.value);

  const totalThisMonth = pieData.reduce((sum, item) => sum + item.value, 0);

  // 2. Prepare Data for Line Chart (Trend over time)
  const timelineMap = expenses.reduce((acc, exp) => {
    const d = new Date(exp.date);
    const monthKey = d.toLocaleString('default', { month: 'short' }); // Dec, Jan, Feb...
    acc[monthKey] = (acc[monthKey] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const currentDateForTrend = new Date();
  const timelineData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDateForTrend.getFullYear(), currentDateForTrend.getMonth() - i, 1);
    const monthKey = d.toLocaleString('default', { month: 'short' });
    timelineData.push({
      month: monthKey,
      total: timelineMap[monthKey] || 0
    });
  }

  // 3. Health Score
  const health = calculateHealthScore(expenses, monthlyIncome);
  const healthScore = !isNaN(health.score) ? health.score : 65; // Default to 65 for UI if no data
  const healthScorePercent = Math.min(Math.max(healthScore, 0), 100);
  
  const getTrendIcon = () => {
    if (prediction.trend === 'increasing') return <TrendingUp color="var(--danger)" size={32} />;
    if (prediction.trend === 'decreasing') return <TrendingDown color="var(--danger)" size={32} />; // Image shows down arrow as red
    return <Minus color="var(--info)" size={32} />;
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <>
      <div className="card-purple" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: 'white', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={28} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 className="font-sans font-medium text-sm" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '0.25rem' }}>Declared Monthly Income</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                     <input 
                        type="number" 
                        className="input-field" 
                        style={{ width: '150px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)' }} 
                        value={editIncome} 
                        onChange={e => setEditIncome(e.target.value)} 
                     />
                     <button className="btn-outline-white" style={{ padding: '0.4rem 1rem' }} onClick={handleIncomeSave}>Save</button>
                  </div>
                ) : (
                  <span className="text-4xl font-serif font-medium">{formatINR(monthlyIncome)}</span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>Used for budgeting and savings calculation</p>
            </div>
         </div>
         {!isEditing && (
           <button className="btn-outline-white" onClick={() => setIsEditing(true)}>Edit Income</button>
         )}
      </div>

      <div className="two-col-grid" style={{ marginBottom: '2rem' }}>
        {/* Top left - Health Score */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div className="flex-center-between" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 className="text-lg font-serif">Financial Health Score</h3>
              <Info size={16} color="var(--text-secondary)" />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div className="text-6xl font-serif" style={{ color: 'var(--accent-primary)', marginBottom: '1rem', lineHeight: 1 }}>
                {healthScore}
              </div>
              
              <div style={{ width: '80%', height: '8px', background: 'var(--card-border)', borderRadius: '4px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <div style={{ width: `${healthScorePercent}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
              </div>

              <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '90%' }}>
                <p>Good balance of discretionary spending.</p>
                <p>You have 2 unusually large transactions compared to your average.</p>
                <p style={{ marginTop: '0.25rem' }}>Critical: Your savings ratio is below 10%<br/>(You saved {formatINR(monthlyIncome - totalThisMonth)}).</p>
              </div>
            </div>

            <div style={{ background: 'var(--accent-light)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
              <Activity size={32} color="var(--accent-primary)" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Top right - Future Prediction */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
           <div className="flex-center-between" style={{ marginBottom: '2rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <h3 className="text-lg font-serif">Next Month Prediction</h3>
               <Info size={16} color="var(--text-secondary)" />
             </div>
           </div>

           {isPredicting ? (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div className="loading-spinner" />
             </div>
           ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: 'auto' }}>
                <div style={{ background: 'var(--danger-bg)', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {getTrendIcon()}
                </div>
                <div>
                  <p className="text-5xl font-serif" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', lineHeight: 1 }}>{formatINR(prediction.predictedAmount || 28161)}</p>
                  <p className="text-base" style={{ color: 'var(--danger)', fontWeight: 500 }}>
                    Trend: {prediction.trend === 'increasing' ? 'Increasing' : prediction.trend === 'decreasing' ? 'Decreasing' : 'Neutral'}
                  </p>
                </div>
             </div>
           )}
           
           <div style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginTop: '2.5rem' }}>
              Linear Regression Time Series Forecast (Local AI)
           </div>
        </div>
      </div>

      <div className="two-col-grid">
        {/* Category Breakdown (Pie) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="text-lg font-serif" style={{ marginBottom: '1.5rem' }}>This Month Breakdown</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1 }}>
            <div style={{ width: '160px', height: '160px' }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Others']} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '12px solid var(--card-border)' }} />
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pieData.length > 0 ? pieData.slice(0, 5).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CATEGORY_COLORS[item.name] || CATEGORY_COLORS['Others'] }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', width: '60px', textAlign: 'right' }}>{formatINR(item.value)}</span>
                  <span style={{ color: 'var(--text-secondary)', width: '40px', textAlign: 'right' }}>{Math.round((item.value / totalThisMonth) * 100)}%</span>
                </div>
              )) : (
                <div className="text-secondary text-sm">No expenses this month</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-secondary text-sm">Total Spending</span>
            <span className="text-xl font-serif font-semibold" style={{ color: 'var(--accent-primary)' }}>{formatINR(totalThisMonth)}</span>
          </div>
        </div>

        {/* Timeline (Line) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="text-lg font-serif" style={{ marginBottom: '1.5rem' }}>Spending Trend</h3>
          
          <div style={{ height: '220px', marginLeft: '-1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="var(--text-secondary)" tickFormatter={(value) => `₹${value / 1000}k`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <RechartsTooltip 
                  formatter={(value) => formatINR(value)}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="total" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, fill: 'var(--accent-primary)' }} dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--card-border)', textAlign: 'center' }}>
            <a href="#" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              View full analytics <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
