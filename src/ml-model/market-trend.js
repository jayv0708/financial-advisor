/**
 * market-trend.js — Dynamic Trend Inference
 * =========================================
 * Processes real-time sliding windows to calculate statistical features
 * and output realistic Trend (Uptrend / Downtrend / Stable) and Volatility.
 */

const MODEL_URL = "/models/trend_model_v1.json";
let trendModelCache = null;

const loadTrendModel = async () => {
  if (trendModelCache) return trendModelCache;
  try {
    const resp = await fetch(MODEL_URL);
    if (!resp.ok) return null;
    trendModelCache = await resp.json();
    return trendModelCache;
  } catch (err) {
    return null;
  }
};

/**
 * Compute comprehensive statistical features for the sliding window
 */
export const computeLiveFeatures = (prices, lookback = 30) => {
  // Use up to 'lookback' points
  const window = prices.slice(-lookback);
  const n = window.length;
  if (n < 2) return { price_change_pct: 0, volatility: 0, momentum: 0, slope: 0 };

  const startPrice = window[0];
  const endPrice = window[n - 1];
  
  const price_change_pct = ((endPrice - startPrice) / startPrice) * 100;
  const mean = window.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
  
  // Coefficient of Variation
  const volatility = (std / mean) * 100;

  // Simple slope over the whole window (% change divided by periods)
  const slope = price_change_pct / n;

  // Recent momentum (last 5 periods vs preceding 5)
  const recentSlice = window.slice(-5);
  const prevSlice = window.slice(-10, -5);
  let momentum = 0;
  if(prevSlice.length > 0 && recentSlice.length > 0) {
      const recentMean = recentSlice.reduce((a,b)=>a+b, 0) / recentSlice.length;
      const prevMean = prevSlice.reduce((a,b)=>a+b, 0) / prevSlice.length;
      momentum = ((recentMean - prevMean) / prevMean) * 100;
  }

  return { price_change_pct, volatility, momentum, slope };
};

/**
 * Classify trends dynamically using heuristics (Statistical Alternative)
 * Ensures that out-of-distribution real prices don't break strict scaler bounds.
 */
const dynamicStatisticalClassification = (features) => {
    // If slope over standard period (30 days) is > 0.15% per day, clear uptrend
    if (features.slope > 0.15 || features.price_change_pct > 3.0) return "Uptrend";
    if (features.slope < -0.15 || features.price_change_pct < -3.0) return "Downtrend";
    return "Stable";
};

export const determineAllMarketTrends = async (livePrices) => {
  // Ensure we have our model loaded just in case we need its logic
  await loadTrendModel(); 
  
  const results = {};

  for (const [asset, prices] of Object.entries(livePrices)) {
    // 1. Calculate live features from latest data
    const features = computeLiveFeatures(prices, 30);
    
    // 2. Classify trend dynamically mapping real logic instead of blind static predict
    const trend = dynamicStatisticalClassification(features);

    // 3. Determine Risk/Volatility buckets
    let volLevel = "Low";
    if (features.volatility > 5.0) volLevel = "High";
    else if (features.volatility > 2.0) volLevel = "Medium";

    results[asset] = {
        trend: trend,
        volatility: volLevel,
        rawFeatures: features
    };
  }

  return results;
};
