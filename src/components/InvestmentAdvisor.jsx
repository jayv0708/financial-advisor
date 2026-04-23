import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatINR } from '../utils/constants';
import { determineAllMarketTrends } from '../ml-model/market-trend';
import { generateAllocation } from '../utils/investment-engine';
import { fetchMarketData, extractMarketStats } from '../utils/market-data-fetcher';
import { Activity, ShieldCheck, Target, TrendingUp, AlertTriangle, HelpCircle, RefreshCw, Clock } from 'lucide-react';

/**
 * Expected return rates (annualised, conservative estimates — NOT guaranteed).
 * These are based on historical CAGR approximations only.
 */
const EXPECTED_RETURNS = {
  "Cash / FDs":       0.065,   // ~6.5% p.a. (FD rates India)
  "Gold":             0.10,    // ~10% p.a. (10-year average CAGR)
  "Stocks (Nifty50)": 0.12,    // ~12% p.a. (Nifty50 long-run CAGR)
  "Crypto (BTC)":     0.25,    // ~25% p.a. (high volatility, wide range)
};

/**
 * Compute projected portfolio value after 'years' of monthly SIP investments.
 * Uses compound interest formula for each asset class.
 *
 * P = monthlySIP × [((1+r)^n − 1) / r] × (1+r)
 * where r = monthly rate, n = total months
 */
const computeGrowthProjection = (allocations, years = 1) => {
  const months = years * 12;
  let totalProjected = 0;

  allocations.forEach((asset) => {
    const monthlyInvestment = asset.amount;
    const annualRate = EXPECTED_RETURNS[asset.name] ?? 0.07;
    const monthlyRate = annualRate / 12;

    if (monthlyRate === 0 || monthlyInvestment === 0) {
      totalProjected += monthlyInvestment * months;
      return;
    }
    // SIP future value formula
    const fv = monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    totalProjected += fv;
  });

  return Math.round(totalProjected);
};

/**
 * Build yearly projection array: [{ year: 1, value: X }, ...]
 */
const buildProjectionSeries = (allocations, years = 5) => {
  return Array.from({ length: years }, (_, i) => ({
    year: `Year ${i + 1}`,
    value: computeGrowthProjection(allocations, i + 1),
    invested: allocations.reduce((s, a) => s + a.amount, 0) * 12 * (i + 1),
  }));
};

const Tooltip_ = ({ title, text }) => (
  <span title={text} style={{ cursor: 'help', marginLeft: '6px', opacity: 0.6 }}>
    <HelpCircle size={14} />
  </span>
);

const InvestmentAdvisor = ({ expenses, monthlyIncome }) => {
  const [riskLevel, setRiskLevel] = useState('Medium');
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [livePrices, setLivePrices] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState('');
  const [projectionYears, setProjectionYears] = useState(3);

  // Calculate this-month savings
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalSpent = thisMonthExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const savingsAmount = monthlyIncome - totalSpent;

  useEffect(() => {
    let interval;
    const analyzeMarket = async () => {
      setIsFetching(true);
      try {
        const liveData = await fetchMarketData();
        setLivePrices(liveData);
        setLastFetched(new Date());

        const analysis = await determineAllMarketTrends(liveData);
        setMarketAnalysis(analysis);
      } catch (err) {
        console.error("Error fetching or analyzing market data:", err);
      } finally {
        setIsFetching(false);
      }
    };
    
    // Initial fetch
    analyzeMarket();
    
    // Poll every 60 seconds
    interval = setInterval(analyzeMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!marketAnalysis || !livePrices) {
    return (
      <div className="card" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
        <p className="text-secondary font-medium">Fetching Live Market Data & Machine Learning Features...</p>
        <p className="text-xs text-secondary mt-1" style={{opacity: 0.6}}>Connecting to Yahoo Finance & CoinGecko...</p>
      </div>
    );
  }

  const { allocations, message, insights } = generateAllocation(savingsAmount, riskLevel, marketAnalysis);
  const projectionSeries = savingsAmount > 0 ? buildProjectionSeries(allocations, projectionYears) : [];
  const finalValue = projectionSeries.length > 0 ? projectionSeries[projectionSeries.length - 1].value : 0;
  const totalInvested = projectionSeries.length > 0 ? projectionSeries[projectionSeries.length - 1].invested : 0;
  const estimatedGain = finalValue - totalInvested;

  const getTrendBadge = (trend) => {
    let color = 'var(--text-secondary)';
    if (trend === 'Uptrend')   color = 'var(--success)';
    if (trend === 'Downtrend') color = 'var(--danger)';
    return <span style={{ color, fontWeight: 'bold', fontSize: '13px' }}>{trend}</span>;
  };

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <Target size={28} color="var(--accent-primary)" />
        <h3 className="text-xl font-bold">Live AI Investment Advisor</h3>
        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(46, 204, 113, 0.2)', color: 'var(--success)', fontWeight: 'bold' }}>LIVE DATA</span>
      </div>
      <p className="text-secondary text-sm" style={{ marginBottom: '2rem' }}>
        Portfolio allocation dynamically driven by live market index data and real-time statistical ML heuristics (Volatility & Momentum).
      </p>

      {/* Settings Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        
        {/* Investable Capital */}
        <div style={{ flex: 1, minWidth: '180px' }}>
          <h4 className="font-semibold text-sm text-secondary" style={{ marginBottom: '0.5rem' }}>
            Investable Savings This Month
            <Tooltip_ text="Monthly Income minus this month's total expenses" />
          </h4>
          <p className="text-3xl font-bold" style={{ color: savingsAmount > 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatINR(savingsAmount)}
          </p>
        </div>

        {/* Risk Tolerance */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h4 className="font-semibold text-sm text-secondary" style={{ marginBottom: '0.75rem' }}>
            Risk Tolerance
            <Tooltip_ text="Low: safety first. Medium: balanced growth. High: aggressive returns." />
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['Low', 'Medium', 'High'].map(level => (
              <button key={level} onClick={() => setRiskLevel(level)}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: '8px', cursor: 'pointer',
                  background: riskLevel === level ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${riskLevel === level ? 'var(--accent-primary)' : 'var(--card-border)'}`,
                  color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '6px'
                }}>
                {level === 'Low' && <ShieldCheck size={16} />}
                {level === 'Medium' && <Activity size={16} />}
                {level === 'High' && <TrendingUp size={16} />}
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Savings Goal */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h4 className="font-semibold text-sm text-secondary" style={{ marginBottom: '0.5rem' }}>
            Target Savings Goal (optional)
          </h4>
          <input
            type="number" className="input-field" placeholder="e.g. 500000"
            value={savingsGoal} onChange={e => setSavingsGoal(e.target.value)}
            style={{ padding: '0.6rem' }}
          />
        </div>

        {/* Projection Years */}
        <div style={{ flex: 1, minWidth: '180px' }}>
          <h4 className="font-semibold text-sm text-secondary" style={{ marginBottom: '0.5rem' }}>
            Projection Horizon: {projectionYears} yr
          </h4>
          <input type="range" min={1} max={10} value={projectionYears}
            onChange={e => setProjectionYears(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
          />
        </div>
      </div>

      {/* Main Advisor Body */}
      {savingsAmount <= 0 ? (
        <div className="insight-card alert" style={{ margin: 0 }}>
          <AlertTriangle size={24} />
          <div>
            <p className="font-semibold">No Investable Surplus</p>
            <p className="text-sm text-secondary">Your expenses exceed your declared income ({formatINR(monthlyIncome)}). Reduce expenses to free up capital.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="two-col-grid" style={{ alignItems: 'start' }}>
            {/* Allocation Pie */}
            <div style={{ height: '300px' }}>
              <h4 className="font-semibold mb-2" style={{ marginBottom: '1rem' }}>Portfolio Allocation</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocations} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                    paddingAngle={5} dataKey="percent"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${percent}%`}>
                    {allocations.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n, p) => [`${v}% (${formatINR(p.payload.amount)}/mo)`, n]}
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* ML Trends + Insights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)' }}>
                <h4 className="font-semibold mb-2" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Asset Trends Live <span className="text-xs text-secondary font-medium">(ML Output)</span></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                     {isFetching ? <RefreshCw size={12} className="animate-spin" /> : <Clock size={12} />}
                     {isFetching ? 'Updating...' : lastFetched ? `Sync: ${lastFetched.toLocaleTimeString()}` : ''}
                  </div>
                </h4>
                {[['Nifty50', 'Stocks'], ['Gold', '10g Gold'], ['Bitcoin', 'Crypto']].map(([key, label]) => {
                  const stats = extractMarketStats(livePrices[key]);
                  const analysis = marketAnalysis[key];
                  const isPositive = stats.changePercent >= 0;
                  
                  return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span className="text-sm font-semibold">{label}</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {formatINR(stats.currentPrice)} 
                                <span style={{ color: isPositive ? 'var(--success)' : 'var(--danger)', marginLeft: '6px' }}>
                                    {isPositive ? '+' : ''}{stats.changePercent.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {getTrendBadge(analysis.trend)}
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Vol: {analysis.volatility}</div>
                        </div>
                    </div>
                  </div>
                  )
                })}
              </div>

              <div>
                {insights.map((insight, idx) => (
                  <div key={idx} className="insight-card info animate-fade-in"
                    style={{ margin: '0 0 0.5rem', padding: '0.75rem', animationDelay: `${idx * 0.1}s` }}>
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Growth Projection Chart */}
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 className="font-semibold">
                Investment Growth Projection
                <span className="text-xs text-secondary font-medium"> (estimated — not guaranteed)</span>
              </h4>
              <div style={{ textAlign: 'right' }}>
                <p className="text-xs text-secondary">After {projectionYears} years</p>
                <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{formatINR(finalValue)}</p>
                <p className="text-xs text-secondary">Invested: {formatINR(totalInvested)} · Gain: ~{formatINR(estimatedGain)}</p>
              </div>
            </div>

            {savingsGoal && Number(savingsGoal) > 0 && (
              <div className={`insight-card ${finalValue >= Number(savingsGoal) ? 'success' : 'warning'}`}
                style={{ margin: '0 0 1rem' }}>
                <p className="text-sm">
                  Your savings goal of {formatINR(savingsGoal)}: {finalValue >= Number(savingsGoal)
                    ? `You will reach your goal within ${projectionYears} years.`
                    : `At this rate you will have ${formatINR(finalValue)} in ${projectionYears} years. Consider increasing investment or extending timeline.`}
                </p>
              </div>
            )}

            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionSeries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--info)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="year" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
                  <Tooltip
                    formatter={(v, name) => [formatINR(v), name === 'value' ? 'Portfolio Value' : 'Total Invested']}
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="invested" stroke="var(--info)" fill="url(#investedGrad)" strokeWidth={2} name="invested" />
                  <Area type="monotone" dataKey="value" stroke="var(--success)" fill="url(#valueGrad)" strokeWidth={2} name="value" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-secondary" style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
              Projections use historical CAGR estimates (FDs: 6.5%, Gold: ~10%, Nifty50: ~12%, Crypto: ~25%).
              Returns are NOT guaranteed. This is educational guidance only, not financial advice.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default InvestmentAdvisor;
