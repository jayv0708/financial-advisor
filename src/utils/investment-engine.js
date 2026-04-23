import { formatINR } from "./constants";

/**
 * Smart Investment Allocation Engine
 * 
 * Rules:
 * Calculates allocation percentages based on:
 * 1. User specified Risk Tolerance (Low, Medium, High)
 * 2. Available monthly savings
 * 3. Machine-learned market trends and real-time volatility
 */

export const generateAllocation = (savingsAmount, riskLevel, marketAnalysis) => {
  if (savingsAmount <= 0) {
      return {
          allocations: [
              { name: 'Savings Account', percent: 100, amount: 0, color: '#95A5A6' }
          ],
          message: "You currently don't have surplus savings this month to invest. Focus on reducing expenses!",
          insights: []
      }
  }

  // Base Allocations based purely on Risk Profile (Gold, Stocks/Nifty, Crypto, Cash Savings)
  let baseWeights = { Cash: 0, Gold: 0, Nifty50: 0, Bitcoin: 0 };
  
  if (riskLevel === 'Low') {
      baseWeights = { Cash: 40, Gold: 40, Nifty50: 20, Bitcoin: 0 };
  } else if (riskLevel === 'Medium') {
      baseWeights = { Cash: 20, Gold: 20, Nifty50: 50, Bitcoin: 10 };
  } else if (riskLevel === 'High') {
      baseWeights = { Cash: 10, Gold: 10, Nifty50: 40, Bitcoin: 40 };
  }

  const insights = [];
  insights.push(`We recommend investing ${formatINR(savingsAmount)} across a ${riskLevel}-risk portfolio.`);

  // Factor in ML Market Trends and Volatility to adjust weights +/- 15%
  const adjustWeight = (assetName, weightKey) => {
      const analysis = marketAnalysis[assetName];
      if (!analysis) return;
      
      const { trend, volatility } = analysis;

      // De-risk if high volatility for low/med risk users
      if (volatility === "High" && (riskLevel === "Low" || riskLevel === "Medium") && baseWeights[weightKey] > 0) {
          const shift = Math.floor(baseWeights[weightKey] * 0.5); // Reduce risk
          baseWeights[weightKey] -= shift;
          baseWeights.Cash += shift; 
          insights.push(`${assetName} shows high volatility (variance over recent window), so your risky allocation was reduced and shifted to Cash.`);
      } 
      // Trend based weighting
      else if (trend === "Downtrend" && baseWeights[weightKey] > 0) {
          const shift = Math.floor(baseWeights[weightKey] * 0.3); // Decrease weight
          baseWeights[weightKey] -= shift;
          baseWeights.Cash += shift; // Move to safety
          insights.push(`${assetName} is in a statistical Downtrend. Allocation reduced for safety.`);
      } else if (trend === "Uptrend") {
          // slight boost pulled from cash
          if (baseWeights.Cash >= 5) {
              baseWeights[weightKey] += 5;
              baseWeights.Cash -= 5;
              const feat = analysis.rawFeatures;
              const slopeStr = feat ? `${feat.slope.toFixed(2)}%` : 'positive';
              insights.push(`${assetName} is prioritizing capital due to steady Uptrend momentum (slope: ${slopeStr}).`);
          }
      }
  };

  adjustWeight("Nifty50", "Nifty50");
  adjustWeight("Gold", "Gold");
  adjustWeight("Bitcoin", "Bitcoin");

  // Format into recharts friendly array
  const allocations = [
      { name: "Cash / FDs", percent: baseWeights.Cash, amount: (savingsAmount * baseWeights.Cash) / 100, color: "#3498DB" },
      { name: "Gold", percent: baseWeights.Gold, amount: (savingsAmount * baseWeights.Gold) / 100, color: "#F1C40F" },
      { name: "Stocks (Nifty50)", percent: baseWeights.Nifty50, amount: (savingsAmount * baseWeights.Nifty50) / 100, color: "#9B59B6" },
      { name: "Crypto (BTC)", percent: baseWeights.Bitcoin, amount: (savingsAmount * baseWeights.Bitcoin) / 100, color: "#E67E22" }
  ].filter(a => a.percent > 0); // remove zeros

  return { allocations, message: "Your dynamically allocated portfolio:", insights };
};
