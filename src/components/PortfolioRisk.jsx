/**
 * PortfolioRisk.jsx — Portfolio Risk Scoring Widget
 * ==================================================
 * Calls POST /risk with a user-defined portfolio and displays
 * the Sharpe ratio, volatility, max drawdown, and risk score.
 */

import React, { useState } from 'react';
import { Shield, Plus, Trash2, Loader, AlertCircle, Activity } from 'lucide-react';
import { fetchRisk } from '../utils/useMLApi';

const DEFAULT_PORTFOLIO = [
  { ticker: 'AAPL', weight: 0.4 },
  { ticker: 'MSFT', weight: 0.3 },
  { ticker: 'GOOGL', weight: 0.3 },
];

function MetricTile({ label, value, sub, color }) {
  return (
    <div style={{
      flex: 1, padding: '0.9rem 1rem', borderRadius: '0.6rem',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      minWidth: 110,
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color || 'inherit' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );
}

function RiskGauge({ score }) {
  const color = score < 30 ? '#34d399' : score < 60 ? '#fbbf24' : '#f87171';
  const label = score < 30 ? 'Low Risk' : score < 60 ? 'Medium Risk' : 'High Risk';
  const angle = (score / 100) * 180 - 90; // -90 to +90 degrees
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <svg viewBox="0 0 200 110" width="180" style={{ overflow: 'visible' }}>
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
        {/* Green zone */}
        <path d="M 20 100 A 80 80 0 0 1 68 28" fill="none" stroke="#34d399" strokeWidth="16" strokeLinecap="round" opacity="0.4" />
        {/* Yellow zone */}
        <path d="M 68 28 A 80 80 0 0 1 132 28" fill="none" stroke="#fbbf24" strokeWidth="16" strokeLinecap="round" opacity="0.4" />
        {/* Red zone */}
        <path d="M 132 28 A 80 80 0 0 1 180 100" fill="none" stroke="#f87171" strokeWidth="16" strokeLinecap="round" opacity="0.4" />
        {/* Needle */}
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="30" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill={color} />
        </g>
      </svg>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, color, marginTop: '-0.5rem' }}>{Math.round(score)}</div>
      <div style={{ fontSize: '0.9rem', color, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export default function PortfolioRisk() {
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function addRow() {
    setPortfolio(p => [...p, { ticker: 'SPY', weight: 0.1 }]);
  }

  function removeRow(i) {
    setPortfolio(p => p.filter((_, idx) => idx !== i));
  }

  function updateRow(i, field, value) {
    setPortfolio(p => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  const totalWeight = portfolio.reduce((s, r) => s + Number(r.weight || 0), 0);

  async function handleScore() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const cleaned = portfolio.map(r => ({ ticker: r.ticker.toUpperCase(), weight: Number(r.weight) }));
      const data = await fetchRisk(cleaned);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f093fb, #f5576c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Portfolio Risk Scorer</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            LinearRegression · Sharpe · Max Drawdown · 1-Year Data
          </p>
        </div>
      </div>

      {/* Portfolio input table */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticker</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight</span>
          <span />
        </div>
        {portfolio.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <input
              value={row.ticker}
              onChange={e => updateRow(i, 'ticker', e.target.value.toUpperCase())}
              id={`portfolio-ticker-${i}`}
              placeholder="AAPL"
              style={{
                padding: '0.45rem 0.65rem', borderRadius: '0.4rem',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'inherit', fontSize: '0.88rem', textTransform: 'uppercase',
              }}
            />
            <input
              type="number"
              min="0.01" max="1" step="0.05"
              value={row.weight}
              onChange={e => updateRow(i, 'weight', e.target.value)}
              id={`portfolio-weight-${i}`}
              style={{
                padding: '0.45rem 0.65rem', borderRadius: '0.4rem',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'inherit', fontSize: '0.88rem',
              }}
            />
            <button
              onClick={() => removeRow(i)}
              disabled={portfolio.length <= 1}
              style={{
                padding: '0.45rem', borderRadius: '0.4rem', border: 'none',
                background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer',
                opacity: portfolio.length <= 1 ? 0.3 : 1,
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={addRow}
          id="add-portfolio-row"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          <Plus size={13} /> Add Position
        </button>
        <div style={{
          marginTop: '0.5rem', fontSize: '0.8rem',
          color: Math.abs(totalWeight - 1) > 0.01 ? '#f87171' : '#34d399',
        }}>
          Total weight: {(totalWeight * 100).toFixed(0)}%
          {Math.abs(totalWeight - 1) > 0.01 ? ' (should sum to 100%)' : ' ✓'}
        </div>
      </div>

      {/* Score button */}
      <button
        id="score-portfolio-button"
        onClick={handleScore}
        disabled={loading || portfolio.length === 0}
        style={{
          padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: 'none',
          background: 'linear-gradient(135deg, #f093fb, #f5576c)',
          color: '#fff', fontWeight: 600, fontSize: '0.9rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          marginBottom: '1.25rem', transition: 'opacity 0.2s',
        }}
      >
        {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Activity size={14} />}
        {loading ? 'Scoring…' : 'Score Portfolio'}
      </button>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          padding: '0.75rem 1rem', borderRadius: '0.5rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem',
        }}>
          <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          <RiskGauge score={result.risk_score} />
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <MetricTile
              label="Annualized Return"
              value={`${(result.annualized_return * 100).toFixed(1)}%`}
              color={result.annualized_return >= 0 ? '#34d399' : '#f87171'}
            />
            <MetricTile
              label="Volatility"
              value={`${(result.annualized_volatility * 100).toFixed(1)}%`}
              color={result.annualized_volatility < 0.2 ? '#34d399' : result.annualized_volatility < 0.35 ? '#fbbf24' : '#f87171'}
            />
            <MetricTile
              label="Sharpe Ratio"
              value={result.sharpe_ratio.toFixed(2)}
              sub="Risk-free: 4.5%"
              color={result.sharpe_ratio >= 1 ? '#34d399' : result.sharpe_ratio >= 0 ? '#fbbf24' : '#f87171'}
            />
            <MetricTile
              label="Max Drawdown"
              value={`${(result.max_drawdown * 100).toFixed(1)}%`}
              color={Math.abs(result.max_drawdown) < 0.15 ? '#34d399' : '#f87171'}
            />
          </div>

          {/* Correlation matrix */}
          {result.correlation_matrix && Object.keys(result.correlation_matrix).length > 1 && (
            <div style={{ marginTop: '1.25rem' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Correlation Matrix
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '0.82rem', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left' }}></th>
                      {result.available_tickers.map(t => (
                        <th key={t} style={{ padding: '0.3rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.available_tickers.map(row => (
                      <tr key={row}>
                        <td style={{ padding: '0.3rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{row}</td>
                        {result.available_tickers.map(col => {
                          const val = result.correlation_matrix[row]?.[col] ?? 0;
                          const bg = val === 1 ? 'transparent'
                            : val > 0.7 ? 'rgba(248,113,113,0.2)'
                            : val > 0.4 ? 'rgba(251,191,36,0.15)'
                            : 'rgba(52,211,153,0.1)';
                          return (
                            <td key={col} style={{
                              padding: '0.3rem 0.5rem', textAlign: 'center',
                              background: bg, borderRadius: '0.25rem',
                              fontWeight: row === col ? 700 : 400,
                            }}>
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
