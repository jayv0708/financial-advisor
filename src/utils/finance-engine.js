import { CATEGORIES, formatINR } from "./constants";

/**
 * Calculates a financial health score (0-100) based on:
 * 1. Savings Ratio (or spending relative to a total)
 * 2. Category balance (not spending too much in a single non-essential category)
 * 3. Spending consistency
 */
export const calculateHealthScore = (expenses, rawIncome = 0) => {
  const monthlyIncome = Number(rawIncome) || 0;
  
  if (!expenses || expenses.length === 0) {
    return { score: 100, explanation: "No expenses recorded yet. You're at a blank slate!" };
  }

  let score = 100;
  let explanations = [];

  // Group by category
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
    return acc;
  }, {});

  const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // 1. Balance Rule: Food + Shopping shouldn't exceed 50% of total if there are enough expenses
  const discretionary = (categoryTotals["Food"] || 0) + (categoryTotals["Shopping"] || 0);
  if (totalSpent > 0 && discretionary / totalSpent > 0.5) {
    score -= 20;
    explanations.push("- Heavy spending on Food & Shopping (over 50% of total expenses).");
  } else {
    explanations.push("+ Good balance of discretionary spending.");
  }

  // 2. High single transaction penalty
  const averageTx = expenses.length > 0 ? totalSpent / expenses.length : 0;
  const highTxCount = expenses.filter(e => Number(e.amount) > averageTx * 3).length;
  if (highTxCount > 0) {
    score -= (highTxCount * 5); // minus 5 per unusually large transaction
    explanations.push(`- You have ${highTxCount} unusually large transactions compared to your average.`);
  }

  // 3. Category diversity
  const activeCategories = Object.keys(categoryTotals).length;
  if (activeCategories < 2 && totalSpent > 5000) {
    score -= 10;
    explanations.push("- All your spending is funneled into a single category.");
  }

  // 4. Savings Ratio (if income provided)
  if (monthlyIncome > 0) {
    const savingsRatio = (monthlyIncome - totalSpent) / monthlyIncome;
    if (savingsRatio < 0.1) {
      score -= 25;
      explanations.push(`- Critical: Your savings ratio is below 10% (You saved ${formatINR(Math.max(0, monthlyIncome - totalSpent))}).`);
    } else if (savingsRatio > 0.3) {
      score += 10;
      explanations.push("+ Excellent savings ratio (>30%). Great job!");
    } else {
      explanations.push("+ Healthy savings ratio.");
    }
  }

  // Ensure score is between 0 and 100 safely
  score = Math.max(0, Math.min(100, Math.round(Number(score)) || 0));

  return {
    score,
    explanation: explanations.join(" ")
  };
};

/**
 * Intelligent Insight Engine: Generates rule-based insights based on recent spending patterns.
 * Generates at least 5 meaningful rules.
 */
export const generateInsights = (expenses, monthlyIncome = 0) => {
  if (expenses.length === 0) return ["Start adding expenses to see personalized insights!"];

  const insights = [];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Separate current month vs last month
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    let expectedMonth = currentMonth - 1;
    let expectedYear = currentYear;
    if (expectedMonth < 0) {
      expectedMonth = 11;
      expectedYear -= 1;
    }
    return d.getMonth() === expectedMonth && d.getFullYear() === expectedYear;
  });

  const sum = (arr) => arr.reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  const thisMonthTotal = sum(thisMonthExpenses);
  const lastMonthTotal = sum(lastMonthExpenses);

  // New Rule: Overspending against Income Budget
  if (monthlyIncome > 0 && thisMonthTotal > monthlyIncome) {
      insights.push({ type: 'alert', text: `You have exceeded your monthly budget! You spent ${formatINR(thisMonthTotal)} against an income of ${formatINR(monthlyIncome)}.`});
  }

  // Rule 1: Overall spending trend
  if (lastMonthTotal > 0) {
    const percentChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    if (percentChange > 10) {
        insights.push({ type: 'warning', text: `Your spending is up ${percentChange.toFixed(0)}% compared to last month.` });
    } else if (percentChange < -10) {
        insights.push({ type: 'success', text: `Great job! You spent ${Math.abs(percentChange).toFixed(0)}% less than last month.` });
    }
  }

  const thisMonthCat = thisMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const lastMonthCat = lastMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  // Rule 2: Food spending comparison
  const foodThisMonth = thisMonthCat["Food"] || 0;
  const foodLastMonth = lastMonthCat["Food"] || 0;
  if (foodLastMonth > 0 && foodThisMonth > foodLastMonth * 1.3) {
      const foodDiff = ((foodThisMonth - foodLastMonth) / foodLastMonth) * 100;
      insights.push({ type: 'warning', text: `You spent ${foodDiff.toFixed(0)}% more on Food this month.` });
  }

  // Rule 3: Single extremely large transaction check
  if (thisMonthExpenses.length > 0) {
      const maxTx = thisMonthExpenses.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
      if (maxTx.amount > thisMonthTotal * 0.4 && thisMonthTotal > 0) {
        insights.push({ type: 'alert', text: `A single transaction ("${maxTx.text}") accounts for over 40% of this month's spending!`});
      }
  }

  // Rule 4: Frequent small purchases (e.g. daily coffee/snacks) over-accumulation
  const smallTx = thisMonthExpenses.filter(e => e.amount < 500); // 500 INR
  if (smallTx.length > 5) {
      const smallTxTotal = sum(smallTx);
      insights.push({ type: 'info', text: `You have ${smallTx.length} small purchases (under ₹500) totaling ${formatINR(smallTxTotal)}. These micro-transactions add up.`});
  }

  if (insights.length === 0) {
      insights.push({ type: 'success', text: "Your spending seems consistent and well-managed based on current data." });
  }

  return insights;
};
