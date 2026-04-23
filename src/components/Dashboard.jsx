import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { CATEGORY_COLORS, formatINR } from '../utils/constants';
import { calculateHealthScore } from '../utils/finance-engine';
import { predictNextMonthSpending } from '../ml-model/predictor';
import { TrendingUp, TrendingDown, Minus, Wallet } from 'lucide-react';

const Dashboard = ({ expenses, monthlyIncome, onUpdateIncome }) => {
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
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const categoryTotals = thisMonthExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const pieData = Object.keys(categoryTotals).map(cat => ({
    name: cat,
    value: categoryTotals[cat]
  }));

  // 2. Prepare Data for Line Chart (Trend over time)
  const timelineMap = expenses.reduce((acc, exp) => {
    const d = new Date(exp.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  // Generate the last 6 months to ensure we always have a trend line, even on a new timeline
  const currentDateForTrend = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDateForTrend.getFullYear(), currentDateForTrend.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!(monthKey in timelineMap)) {
      timelineMap[monthKey] = 0;
    }
  }

  const timelineData = Object.keys(timelineMap).sort().map(key => ({
    month: key,
    total: timelineMap[key]
  }));

  // 3. Health Score
  const health = calculateHealthScore(expenses, monthlyIncome);
  
  const getTrendIcon = () => {
    if (prediction.trend === 'increasing') return <TrendingUp color="var(--danger)" size={24} />;
    if (prediction.trend === 'decreasing') return <TrendingDown color="var(--success)" size={24} />;
    return <Minus color="var(--info)" size={24} />;
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <>
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Wallet size={24} color="var(--info)" />
            <div>
              <h3 className="font-semibold">Declared Monthly Income</h3>
              <p className="text-secondary text-sm">Used for budgeting and savings calculation</p>
            </div>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isEditing ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <input 
                    type="number" 
                    className="input-field" 
                    style={{ width: '150px', padding: '0.5rem' }} 
                    value={editIncome} 
                    onChange={e => setEditIncome(e.target.value)} 
                 />
                 <button className="btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={handleIncomeSave}>Save</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <span className="text-2xl font-bold">{formatINR(monthlyIncome)}</span>
                 <button className="btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto', background: 'transparent', border: '1px solid var(--card-border)' }} onClick={() => setIsEditing(true)}>Edit</button>
              </div>
            )}
         </div>
      </div>

      <div className="two-col-grid">
        {/* Top left - Health Score */}
        <div className="card health-score-container text-center">
          <h3 className="text-lg font-semibold" style={{ alignSelf: 'flex-start', position: 'absolute', top: '1.5rem', left: '1.5rem' }}>Financial Health Score</h3>
          <div className="health-score-value" style={{ WebkitTextFillColor: getHealthColor(health.score), backgroundImage: 'none' }}>
            {!isNaN(health.score) ? health.score : 0}
          </div>
          <p className="text-sm text-secondary" style={{ maxWidth: '80%', marginTop: '1rem' }}>
            {health.explanation || "Keep tracking to get better insights."}
          </p>
        </div>

        {/* Top right - Future Prediction */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
           <h3 className="text-lg font-semibold" style={{ marginBottom: '1.5rem' }}>Next Month Prediction</h3>
           {isPredicting ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
               <div className="loading-spinner" />
               <p className="text-secondary">Predicting via ML model...</p>
             </div>
           ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '50%' }}>
                   {getTrendIcon()}
                </div>
                <div>
                  <p className="text-4xl font-bold">{formatINR(prediction.predictedAmount || 0)}</p>
                  <p className="text-sm text-secondary" style={{ textTransform: 'capitalize' }}>
                    Trend: {prediction.trend || 'neutral'}
                  </p>
                </div>
             </div>
           )}
           
           <p className="text-xs text-secondary bg-opacity-10 p-2 rounded" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
              Linear Regression Time Series Forecast (Local AI)
           </p>
        </div>
      </div>

      <div className="two-col-grid">
        {/* Category Breakdown (Pie) */}
        <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="text-lg font-semibold" style={{ marginBottom: '1rem' }}>This Month Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Others']} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatINR(value)}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
             <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>No expenses this month.</div>
          )}
        </div>

        {/* Timeline (Line) */}
        <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="text-lg font-semibold" style={{ marginBottom: '1rem' }}>Spending Trend</h3>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" 
                       tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip 
                  formatter={(value) => formatINR(value)}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>No sufficient data for trend.</div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
