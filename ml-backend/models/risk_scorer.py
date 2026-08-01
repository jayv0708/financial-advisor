"""
risk_scorer.py — Portfolio Risk Scoring Model
===============================================
Accepts a portfolio (list of {ticker, weight}), fetches 1-year prices,
computes financial risk metrics, and returns a composite risk score 0–100.

Metrics computed:
- Annualized return
- Annualized volatility
- Sharpe ratio (risk-free rate = 4.5%)
- Maximum drawdown
- Correlation matrix
- Composite risk score via LinearRegression on synthetic training data
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pipeline.ingest import fetch_stock_data

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "risk_model.joblib")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

RISK_FREE_RATE = 0.045  # 4.5% annual (US Treasury approx)


def _compute_portfolio_metrics(portfolio: list[dict]) -> dict:
    """
    Compute financial risk metrics for a given portfolio.

    Args:
        portfolio: List of {"ticker": str, "weight": float} dicts.
                   Weights should sum to ~1.0.

    Returns:
        Dictionary with all computed metrics.
    """
    # Fetch price data for all tickers
    price_dfs = {}
    for p in portfolio:
        try:
            df = fetch_stock_data(p["ticker"], period="1y", use_cache=True)
            price_dfs[p["ticker"]] = df.set_index("Date")["Close"]
        except Exception as e:
            print(f"[risk_scorer] Warning: Could not fetch {p['ticker']}: {e}")

    if not price_dfs:
        raise ValueError("Could not fetch data for any ticker in the portfolio.")

    # Build price matrix
    prices = pd.DataFrame(price_dfs)
    prices = prices.dropna()

    # Daily returns
    daily_returns = prices.pct_change().dropna()

    # Weighted portfolio returns
    weights = np.array([p["weight"] for p in portfolio if p["ticker"] in price_dfs])
    weights = weights / weights.sum()  # Normalize

    available_tickers = [p["ticker"] for p in portfolio if p["ticker"] in price_dfs]
    portfolio_returns = daily_returns[available_tickers].dot(weights)

    # Annualized return
    ann_return = float(portfolio_returns.mean() * 252)

    # Annualized volatility
    ann_volatility = float(portfolio_returns.std() * np.sqrt(252))

    # Sharpe ratio
    sharpe = float((ann_return - RISK_FREE_RATE) / ann_volatility) if ann_volatility > 0 else 0.0

    # Maximum drawdown
    cumulative = (1 + portfolio_returns).cumprod()
    peak = cumulative.cummax()
    drawdown = (cumulative - peak) / peak
    max_drawdown = float(drawdown.min())

    # Correlation matrix
    corr_matrix = daily_returns[available_tickers].corr()

    return {
        "annualized_return": round(ann_return, 4),
        "annualized_volatility": round(ann_volatility, 4),
        "sharpe_ratio": round(sharpe, 4),
        "max_drawdown": round(max_drawdown, 4),
        "correlation_matrix": {
            t: {t2: round(corr_matrix.loc[t, t2], 4) for t2 in available_tickers}
            for t in available_tickers
        },
        "available_tickers": available_tickers,
    }


def train(log_to_mlflow: bool = True) -> dict:
    """
    Train a LinearRegression model that maps risk metrics to a 0–100 score.

    Uses synthetic labeled data:
    - Low volatility + high Sharpe → low risk (0–30)
    - Medium metrics → medium risk (30–60)
    - High volatility + negative Sharpe → high risk (60–100)
    """
    np.random.seed(42)
    n = 500

    # Synthetic features: [volatility, sharpe, max_drawdown (abs)]
    volatility = np.random.uniform(0.05, 0.60, n)
    sharpe = np.random.uniform(-1.0, 3.0, n)
    max_dd = np.random.uniform(0.02, 0.50, n)

    X = np.column_stack([volatility, sharpe, max_dd])

    # Risk score: higher volatility, lower sharpe, deeper drawdown = higher risk
    y = (volatility * 80) + (max_dd * 60) - (sharpe * 15) + np.random.normal(0, 3, n)
    y = np.clip(y, 0, 100)

    model = LinearRegression()
    model.fit(X, y)

    # Evaluate
    y_pred = model.predict(X)
    from pipeline.evaluate import evaluate_risk_model
    metrics = evaluate_risk_model(y, y_pred)

    joblib.dump({"model": model, "metrics": metrics}, MODEL_PATH)

    if log_to_mlflow:
        try:
            from mlflow_setup import log_training_run
            log_training_run(
                experiment_name="risk-scorer",
                params={"model_type": "LinearRegression", "n_features": 3},
                metrics=metrics,
                artifact_path=MODEL_PATH,
                tag="manual",
            )
        except Exception as e:
            print(f"[risk_scorer] MLflow logging skipped: {e}")

    print(f"[risk_scorer] Trained: R²={metrics['r2_score']:.4f}, MAE={metrics['mae']:.2f}")
    return {"metrics": metrics}


def score(portfolio: list[dict]) -> dict:
    """
    Score a portfolio's risk on a 0–100 scale.

    Args:
        portfolio: List of {"ticker": str, "weight": float}.

    Returns:
        Dictionary with risk metrics, risk score, and risk level.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("No trained model found. Run train() first.")

    # Compute real metrics from market data
    metrics = _compute_portfolio_metrics(portfolio)

    # Load model and predict risk score
    saved = joblib.load(MODEL_PATH)
    model = saved["model"]

    features = np.array([[
        metrics["annualized_volatility"],
        metrics["sharpe_ratio"],
        abs(metrics["max_drawdown"]),
    ]])

    risk_score = float(np.clip(model.predict(features)[0], 0, 100))

    # Risk level
    if risk_score < 30:
        risk_level = "Low"
    elif risk_score < 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        **metrics,
        "risk_score": round(risk_score, 2),
        "risk_level": risk_level,
    }


def get_current_metrics() -> dict:
    """Load and return metrics from the saved model artifact."""
    if not os.path.exists(MODEL_PATH):
        return {"status": "no model trained"}
    saved = joblib.load(MODEL_PATH)
    return saved.get("metrics", {})


if __name__ == "__main__":
    result = train()
    print(f"\nTraining: {result}")

    test_portfolio = [
        {"ticker": "AAPL", "weight": 0.4},
        {"ticker": "MSFT", "weight": 0.3},
        {"ticker": "GOOGL", "weight": 0.3},
    ]
    risk = score(test_portfolio)
    print(f"\nRisk score: {risk['risk_score']}/100 ({risk['risk_level']})")
    print(f"Sharpe: {risk['sharpe_ratio']}, Vol: {risk['annualized_volatility']}")
