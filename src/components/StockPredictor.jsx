/**
 * StockPredictor.jsx — Stock Direction Prediction Widget
 * =======================================================
 * Calls POST /predict on the FastAPI ML backend and displays
 * per-day direction, confidence, and feature importances.
 */

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Loader, AlertCircle, BarChart2 } from 'lucide-react';
import { fetchPrediction } from '../utils/useMLApi';

const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];

function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', gap: '1rem', alignItems: 'center',
      padding: '0.75rem 1rem', borderRadius: '0.5rem',
      background: 'var(--bg-card, rgba(255,255,255,0.05))',
      marginBottom: '0.5rem', animation: 'pulse 1.5s infinite',
    }}>
      <div style={{ width: 80, height: 16, borderRadius: 4, background: 'var(--bg-hover, rgba(255,255,255,0.1))' }} />
      <div style={{ width: 60, height: 16, borderRadius: 4, background: 'var(--bg-hover, rgba(255,255,255,0.1))' }} />
      <div style={{ flex: 1, height: 16, borderRadius: 4, background: 'var(--bg-hover, rgba(255,255,255,0.1))' }} />
    </div>
  );
}

export default function StockPredictor() {
  const [ticker, setTicker] = useState('AAPL');
  const [days, setDays] = useState(5);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handlePredict() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchPrediction(ticker, days);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Top 5 feature importances
  const topFeatures = result?.feature_importances
    ? Object.entries(result.feature_importances)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];
  const maxImportance = topFeatures[0]?.[1] ?? 1;

  return (
    <div className="card" style={{ padding: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TrendingUp size={20} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Stock Direction Predictor</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            XGBoost · TimeSeriesSplit · No look-ahead bias
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          id="stock-ticker-select"
          style={{
            padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'inherit', fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          id="prediction-days-select"
          style={{
            padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'inherit', fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          {[1, 3, 5, 7, 10].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
        </select>
        <button
          id="predict-button"
          onClick={handlePredict}
          disabled={loading}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff', fontWeight: 600, fontSize: '0.9rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {loading ? 'Predicting…' : 'Predict'}
        </button>
      </div>

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

      {/* Loading skeletons */}
      {loading && (
        <div>
          {[...Array(days > 3 ? 3 : days)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          <div style={{ marginBottom: '1.25rem' }}>
            {result.predictions.map((pred, i) => {
              const isUp = pred.direction === 'up';
              const confPct = Math.round(pred.confidence * 100);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.65rem 0.9rem', borderRadius: '0.5rem',
                  marginBottom: '0.4rem',
                  background: isUp
                    ? 'rgba(52,211,153,0.08)'
                    : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${isUp ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  transition: 'background 0.2s',
                }}>
                  {isUp
                    ? <TrendingUp size={18} color="#34d399" />
                    : <TrendingDown size={18} color="#f87171" />}
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: 80 }}>
                    {pred.date}
                  </span>
                  <span style={{
                    fontWeight: 700, fontSize: '0.95rem',
                    color: isUp ? '#34d399' : '#f87171',
                  }}>
                    {pred.direction.toUpperCase()}
                  </span>
                  {/* Confidence bar */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: 'var(--bg-hover, rgba(255,255,255,0.1))',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${confPct}%`,
                        background: isUp
                          ? 'linear-gradient(90deg,#34d399,#10b981)'
                          : 'linear-gradient(90deg,#f87171,#ef4444)',
                        borderRadius: 3, transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 36 }}>
                      {confPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Importances */}
          {topFeatures.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <BarChart2 size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Top Feature Importances
                </span>
              </div>
              {topFeatures.map(([feat, val]) => (
                <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.78rem', minWidth: 120, color: 'var(--text-secondary)' }}>
                    {feat}
                  </span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-hover, rgba(255,255,255,0.1))', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${(val / maxImportance) * 100}%`,
                      background: 'linear-gradient(90deg,#667eea,#764ba2)',
                      borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: 40 }}>
                    {val.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Model metrics badge */}
          {result.model_metrics?.f1_score && (
            <div style={{
              marginTop: '1rem', padding: '0.5rem 0.75rem', borderRadius: '0.4rem',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              fontSize: '0.78rem', color: 'var(--text-secondary)',
              display: 'flex', gap: '1.5rem',
            }}>
              <span>Model F1: <strong>{result.model_metrics.f1_score?.toFixed(3)}</strong></span>
              <span>Accuracy: <strong>{result.model_metrics.accuracy?.toFixed(3)}</strong></span>
              <span>Precision: <strong>{result.model_metrics.precision?.toFixed(3)}</strong></span>
            </div>
          )}
        </>
      )}

      {/* Idle state */}
      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
          <TrendingUp size={36} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Select a ticker and click Predict</p>
        </div>
      )}
    </div>
  );
}
