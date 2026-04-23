/**
 * predictor.js — Spending Regression Inference
 * =============================================
 * Loads regression_model_v1.json (exported from Python's LinearRegression)
 * and runs polynomial prediction in JavaScript.
 *
 * Model: y = coef[0]*x + coef[1]*x^2 + intercept
 *   where x = month index (0-based from training start)
 */

let regressorCache = null;
const MODEL_URL = "/models/regression_model_v1.json";

const loadRegressorModel = async () => {
  if (regressorCache) return regressorCache;
  try {
    const resp = await fetch(MODEL_URL);
    regressorCache = await resp.json();
    console.log("[Regressor] Loaded regression model from Python pipeline.");
    return regressorCache;
  } catch (err) {
    console.error("[Regressor] Failed to load model:", err);
    return null;
  }
};

/**
 * Predict next month's spending from user's local expense history.
 * Falls back to OLS calculation if model not loaded.
 */
export const predictNextMonthSpending = async (expenses) => {
  if (!expenses || expenses.length === 0) {
    return { predictedAmount: 0, trend: "neutral" };
  }

  // Try loading the Python-trained model
  const model = await loadRegressorModel();

  // Group expenses by month
  const monthlyTotals = expenses.reduce((acc, exp) => {
    const d = new Date(exp.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const sortedMonths = Object.keys(monthlyTotals).sort();
  const n = sortedMonths.length;

  if (n === 0) return { predictedAmount: 0, trend: "neutral" };
  if (n === 1) return { predictedAmount: Math.round(monthlyTotals[sortedMonths[0]] * 1.05), trend: "neutral" };

  // If the trained model is available, use its coefficients with user's latest month index
  if (model) {
    // We offset by n_training_months so we are predicting n months beyond training
    // For simplicity: use the user's own month sequence starting from 0
    const nextMonthIdx = n; // next data point index
    const x1 = nextMonthIdx;
    const x2 = nextMonthIdx * nextMonthIdx;
    let predicted = model.coef[0] * x1 + model.coef[1] * x2 + model.intercept;

    // Scale prediction towards user's actual recent data (50/50 blend)
    const lastMonthSpend = monthlyTotals[sortedMonths[n - 1]];
    const blended = Math.round((predicted * 0.4 + lastMonthSpend * 0.6));

    // Determine trend from last 2 months
    const prev = monthlyTotals[sortedMonths[n - 2]] || 0;
    const diff = lastMonthSpend - prev;
    const trend = diff > 500 ? "increasing" : diff < -500 ? "decreasing" : "neutral";

    return { predictedAmount: Math.max(0, blended), trend };
  }

  // Fallback OLS
  const xVals = sortedMonths.map((_, i) => i);
  const yVals = sortedMonths.map((m) => monthlyTotals[m]);
  const meanX = xVals.reduce((a, b) => a + b, 0) / n;
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;
  let numVar = 0, denVar = 0;
  for (let i = 0; i < n; i++) {
    numVar += (xVals[i] - meanX) * (yVals[i] - meanY);
    denVar += Math.pow(xVals[i] - meanX, 2);
  }
  const slope = denVar !== 0 ? numVar / denVar : 0;
  const intercept = meanY - slope * meanX;
  const predictedY = Math.max(0, slope * n + intercept);
  const trend = slope > 500 ? "increasing" : slope < -500 ? "decreasing" : "neutral";
  return { predictedAmount: Math.round(predictedY), trend };
};
