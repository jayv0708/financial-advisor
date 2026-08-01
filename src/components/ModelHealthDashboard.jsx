/**
 * ModelHealthDashboard.jsx — ML Model Health Monitor
 * ====================================================
 * Displays: last retrain date, F1 score, retrain history,
 * and a manual retrain trigger button.
 */

import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, CheckCircle, XCircle, Clock, Zap, AlertCircle } from 'lucide-react';
import { fetchHealth, fetchMetrics, fetchRetrainLog, triggerRetrain } from '../utils/useMLApi';

function StatusDot({ ok }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: ok ? '#34d399' : '#f87171',
      boxShadow: ok ? '0 0 6px #34d399' : '0 0 6px #f87171',
      marginRight: '0.4rem',
    }} />
  );
}

function MetricCard({ icon: Icon, label, value, sub, color, iconBg }) {
  return (
    <div style={{
      padding: '1rem', borderRadius: '0.65rem',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: iconBg || 'rgba(102,126,234,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={color || '#667eea'} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color || 'inherit' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}

function RetrainLogRow({ entry, isLatest }) {
  const stock = entry.results?.stock_predictor;
  const hasError = !!stock?.error;
  const deployed = stock?.action === 'deployed';

  return (
    <div style={{
      padding: '0.65rem 0.9rem', borderRadius: '0.5rem',
      background: isLatest ? 'rgba(102,126,234,0.07)' : 'transparent',
      border: `1px solid ${isLatest ? 'rgba(102,126,234,0.2)' : 'var(--border)'}`,
      marginBottom: '0.4rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
    }}>
      {hasError
        ? <XCircle size={15} color="#f87171" />
        : deployed
        ? <CheckCircle size={15} color="#34d399" />
        : <AlertCircle size={15} color="#fbbf24" />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
          {new Date(entry.timestamp).toLocaleString()}
          {isLatest && (
            <span style={{
              marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.4rem',
              borderRadius: '0.25rem', background: 'rgba(102,126,234,0.2)', color: '#818cf8',
            }}>latest</span>
          )}
        </div>
        <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
          Trigger: {entry.trigger}
          {!hasError && stock?.old_f1 !== undefined && (
            <> · F1: {stock.old_f1.toFixed(3)} → <span style={{ color: deployed ? '#34d399' : '#f87171', fontWeight: 600 }}>{stock.new_f1.toFixed(3)}</span>
              {' '}({deployed ? '✓ deployed' : '✗ rejected'})</>
          )}
          {hasError && <> · Error: {stock.error}</>}
        </div>
      </div>
    </div>
  );
}

export default function ModelHealthDashboard() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [log, setLog] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState(null);
  const [error, setError] = useState(null);

  async function loadAll() {
    setLoadingData(true);
    setError(null);
    try {
      const [h, m, l] = await Promise.all([fetchHealth(), fetchMetrics(), fetchRetrainLog()]);
      setHealth(h);
      setMetrics(m);
      setLog((l.log || []).slice().reverse()); // newest first
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleRetrain() {
    setRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await triggerRetrain();
      setRetrainMsg(res.status || 'Retrain triggered successfully.');
      setTimeout(() => loadAll(), 3000);
    } catch (e) {
      setRetrainMsg(`Error: ${e.message}`);
    } finally {
      setRetraining(false);
    }
  }

  const stockF1 = metrics?.stock_predictor?.f1_score;
  const lastRetrain = health?.last_retrain;

  return (
    <div className="card" style={{ padding: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Model Health Dashboard</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Retrain every Sunday 2am UTC · Logged to MLflow
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            id="refresh-health-button"
            onClick={loadAll}
            disabled={loadingData}
            title="Refresh"
            style={{
              padding: '0.45rem 0.8rem', borderRadius: '0.4rem', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem',
            }}
          >
            <RefreshCw size={13} style={{ animation: loadingData ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            id="manual-retrain-button"
            onClick={handleRetrain}
            disabled={retraining}
            style={{
              padding: '0.45rem 1rem', borderRadius: '0.4rem', border: 'none',
              background: 'linear-gradient(135deg,#4facfe,#00f2fe)',
              color: '#fff', fontWeight: 600, fontSize: '0.82rem',
              cursor: retraining ? 'not-allowed' : 'pointer', opacity: retraining ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              transition: 'opacity 0.2s',
            }}
          >
            {retraining ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
            {retraining ? 'Retraining…' : 'Trigger Retrain'}
          </button>
        </div>
      </div>

      {/* Retrain message */}
      {retrainMsg && (
        <div style={{
          padding: '0.65rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
          background: 'rgba(79,172,254,0.1)', border: '1px solid rgba(79,172,254,0.3)',
          fontSize: '0.85rem', color: '#4facfe',
        }}>
          {retrainMsg}
        </div>
      )}

      {/* Error */}
      {error && !loadingData && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          padding: '0.75rem 1rem', borderRadius: '0.5rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem',
        }}>
          <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <strong>Could not reach ML backend.</strong>
            <div style={{ marginTop: '0.25rem', opacity: 0.8 }}>{error}</div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.78rem' }}>
              Start the backend: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0 0.3rem', borderRadius: 3 }}>
                uvicorn main:app --reload
              </code> from <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0 0.3rem', borderRadius: 3 }}>ml-backend/</code>
            </div>
          </div>
        </div>
      )}

      {/* Metric cards */}
      {!loadingData && health && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <MetricCard
              icon={CheckCircle}
              label="API Status"
              value={<><StatusDot ok={health.status === 'healthy'} />{health.status}</>}
              sub={`Uptime: ${Math.round(health.uptime_seconds)}s`}
              color="#34d399"
              iconBg="rgba(52,211,153,0.1)"
            />
            <MetricCard
              icon={Clock}
              label="Last Retrain"
              value={lastRetrain ? new Date(lastRetrain).toLocaleDateString() : '—'}
              sub={lastRetrain ? new Date(lastRetrain).toLocaleTimeString() : 'Never retrained'}
              iconBg="rgba(251,191,36,0.1)"
              color="#fbbf24"
            />
            <MetricCard
              icon={Brain}
              label="Stock F1 Score"
              value={stockF1 != null ? stockF1.toFixed(3) : '—'}
              sub="XGBoost · TimeSeriesSplit"
              iconBg="rgba(102,126,234,0.1)"
              color="#818cf8"
            />
            <MetricCard
              icon={Zap}
              label="Total Retrains"
              value={log.length}
              sub="All-time runs"
              iconBg="rgba(79,172,254,0.1)"
              color="#4facfe"
            />
          </div>

          {/* Models loaded status */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {Object.entries(health.models_loaded).map(([model, loaded]) => (
              <div key={model} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.7rem', borderRadius: '2rem',
                background: loaded ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${loaded ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
                fontSize: '0.8rem',
              }}>
                <StatusDot ok={loaded} />
                <span>{model.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Metric detail table */}
      {!loadingData && metrics && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Current Model Metrics
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
            {[
              { name: 'Stock Predictor', data: metrics.stock_predictor },
              { name: 'Anomaly Detector', data: metrics.anomaly_detector },
              { name: 'Risk Scorer', data: metrics.risk_scorer },
            ].map(({ name, data }) => (
              <div key={name} style={{
                padding: '0.7rem 0.9rem', borderRadius: '0.5rem',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                fontSize: '0.8rem',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{name}</div>
                {Object.entries(data || {}).slice(0, 4).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                    <span>{k}:</span>
                    <span style={{ fontWeight: 600, color: 'inherit' }}>
                      {typeof v === 'number' ? v.toFixed(4) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retrain log */}
      {!loadingData && log.length > 0 && (
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Retrain History ({log.length} runs)
          </p>
          {log.slice(0, 6).map((entry, i) => (
            <RetrainLogRow key={entry.timestamp} entry={entry} isLatest={i === 0} />
          ))}
        </div>
      )}

      {loadingData && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading ML backend status…</p>
        </div>
      )}
    </div>
  );
}
