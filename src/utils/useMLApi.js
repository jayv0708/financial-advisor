/**
 * useMLApi.js — React hook for the FastAPI ML backend
 * =====================================================
 * Provides typed fetch helpers for all ML endpoints.
 * Reads backend URL from VITE_ML_API_URL (env variable).
 */

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

/** Generic fetch with error handling */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${ML_API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

/** GET /health */
export async function fetchHealth() {
  return apiFetch('/health');
}

/** GET /metrics */
export async function fetchMetrics() {
  return apiFetch('/metrics');
}

/** POST /predict */
export async function fetchPrediction(ticker, days = 5) {
  return apiFetch('/predict', {
    method: 'POST',
    body: JSON.stringify({ ticker, days }),
  });
}

/** POST /anomaly */
export async function fetchAnomaly(transactions) {
  return apiFetch('/anomaly', {
    method: 'POST',
    body: JSON.stringify({ transactions }),
  });
}

/** POST /risk */
export async function fetchRisk(portfolio) {
  return apiFetch('/risk', {
    method: 'POST',
    body: JSON.stringify({ portfolio }),
  });
}

/** POST /retrain */
export async function triggerRetrain() {
  return apiFetch('/retrain', { method: 'POST' });
}

/** GET /retrain/log */
export async function fetchRetrainLog() {
  return apiFetch('/retrain/log');
}

/** GET /mlflow/runs */
export async function fetchMLflowRuns(experiment = 'stock-predictor', limit = 10) {
  return apiFetch(`/mlflow/runs?experiment=${experiment}&limit=${limit}`);
}

/** GET /mlflow/best-model */
export async function fetchBestModel(experiment = 'stock-predictor') {
  return apiFetch(`/mlflow/best-model?experiment=${experiment}`);
}
