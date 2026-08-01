"""
stock_predictor.py — XGBoost Stock Direction Predictor
=======================================================
Predicts next-day price direction (up/down) using technical indicators.

Key design decisions:
- Uses TimeSeriesSplit to prevent look-ahead bias (never random split).
- Features are all backward-looking (RSI, MACD, Bollinger Bands, MAs).
- GridSearchCV tunes hyperparameters within the time-aware split.
- Every training run is logged to MLflow.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from xgboost import XGBClassifier

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pipeline.ingest import fetch_stock_data
from pipeline.features import build_feature_matrix
from pipeline.evaluate import evaluate_stock_model

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "stock_model.joblib")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def train(ticker: str = "AAPL", period: str = "2y", log_to_mlflow: bool = True) -> dict:
    """
    Train an XGBoost classifier for next-day direction prediction.

    Pipeline: ingest → features → TimeSeriesSplit → GridSearchCV → fit → save.

    Args:
        ticker: Stock symbol to train on.
        period: Historical data lookback period.
        log_to_mlflow: Whether to log the run to MLflow.

    Returns:
        Dictionary with model, metrics, and best parameters.
    """
    # 1. Ingest
    raw_df = fetch_stock_data(ticker, period=period, use_cache=False)

    # 2. Feature Engineering
    df, feature_cols = build_feature_matrix(raw_df)
    X = df[feature_cols].values
    y = df["target"].values

    # 3. Time-aware split (80/20 chronological)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # 4. GridSearchCV with TimeSeriesSplit
    tscv = TimeSeriesSplit(n_splits=3)

    param_grid = {
        "max_depth": [3, 5],
        "learning_rate": [0.05, 0.1],
        "n_estimators": [100, 200],
        "subsample": [0.8],
    }

    base_model = XGBClassifier(
        random_state=42,
        eval_metric="logloss",
    )

    grid_search = GridSearchCV(
        base_model,
        param_grid,
        cv=tscv,
        scoring="f1",
        n_jobs=-1,
        verbose=0,
    )

    grid_search.fit(X_train, y_train)
    best_model = grid_search.best_estimator_

    # 5. Evaluate on holdout set
    y_pred = best_model.predict(X_test)
    metrics = evaluate_stock_model(y_test, y_pred)

    # 6. Feature importance
    importances = dict(zip(feature_cols, best_model.feature_importances_.tolist()))

    # 7. Save model
    joblib.dump({
        "model": best_model,
        "feature_cols": feature_cols,
        "ticker": ticker,
        "metrics": metrics,
        "best_params": grid_search.best_params_,
    }, MODEL_PATH)

    # 8. MLflow logging
    if log_to_mlflow:
        try:
            from mlflow_setup import log_training_run
            log_training_run(
                experiment_name="stock-predictor",
                params={**grid_search.best_params_, "ticker": ticker, "period": period},
                metrics=metrics,
                artifact_path=MODEL_PATH,
                tag="manual",
            )
        except Exception as e:
            print(f"[stock_predictor] MLflow logging skipped: {e}")

    result = {
        "ticker": ticker,
        "metrics": metrics,
        "best_params": grid_search.best_params_,
        "feature_importances": importances,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }

    print(f"[stock_predictor] Trained on {ticker}: F1={metrics['f1_score']:.4f}, Acc={metrics['accuracy']:.4f}")
    return result


def predict(ticker: str = "AAPL", days: int = 5) -> list[dict]:
    """
    Generate predictions for the next `days` trading sessions.

    Loads the trained model, fetches the latest data, builds features,
    and predicts direction with confidence scores.

    Args:
        ticker: Stock symbol.
        days: Number of forward predictions (uses the last `days` feature rows).

    Returns:
        List of prediction dictionaries with direction, confidence, and features.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("No trained model found. Run train() first.")

    saved = joblib.load(MODEL_PATH)
    model = saved["model"]
    feature_cols = saved["feature_cols"]

    # Fetch latest data
    raw_df = fetch_stock_data(ticker, period="6mo", use_cache=True)
    df, _ = build_feature_matrix(raw_df)

    # Use last `days` rows for prediction
    latest = df[feature_cols].tail(days).values

    # Predict direction and confidence
    predictions = model.predict(latest)
    probabilities = model.predict_proba(latest)

    # Feature importance from model
    importances = dict(zip(feature_cols, model.feature_importances_.tolist()))

    results = []
    dates = df["Date"].tail(days).tolist()

    for i in range(len(predictions)):
        direction = "up" if predictions[i] == 1 else "down"
        confidence = float(max(probabilities[i]))
        results.append({
            "date": str(dates[i].date()) if hasattr(dates[i], "date") else str(dates[i]),
            "direction": direction,
            "confidence": round(confidence, 4),
        })

    return {
        "ticker": ticker,
        "predictions": results,
        "feature_importances": importances,
        "model_metrics": saved.get("metrics", {}),
    }


def get_current_metrics() -> dict:
    """Load and return the metrics from the saved model artifact."""
    if not os.path.exists(MODEL_PATH):
        return {"status": "no model trained"}
    saved = joblib.load(MODEL_PATH)
    return saved.get("metrics", {})


if __name__ == "__main__":
    result = train("AAPL", period="2y")
    print(f"\nTraining result: {result}")

    preds = predict("AAPL", days=5)
    print(f"\nPredictions: {preds}")
