"""
anomaly_detector.py — Isolation Forest Transaction Anomaly Detector
====================================================================
Detects anomalous spending transactions using an Isolation Forest.

Uses a synthetic transaction dataset with realistic distributions
and injected anomalies for training. At inference time, it scores
any incoming transaction batch.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pipeline.evaluate import evaluate_anomaly_model

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "anomaly_model.joblib")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

# Spending categories with typical ranges (min, max in USD)
CATEGORY_PROFILES = {
    "groceries":      (10, 150),
    "dining":         (5, 80),
    "transport":      (2, 50),
    "entertainment":  (5, 100),
    "utilities":      (30, 200),
    "shopping":       (10, 300),
    "healthcare":     (20, 500),
    "rent":           (500, 3000),
}


def generate_synthetic_transactions(n: int = 5000) -> pd.DataFrame:
    """
    Generate realistic synthetic spending data with injected anomalies.

    Normal transactions follow category-specific distributions.
    ~5% of transactions are anomalous (extreme amounts or unusual patterns).

    Returns:
        DataFrame with columns: amount, category, day_of_week, hour.
    """
    np.random.seed(42)
    categories = list(CATEGORY_PROFILES.keys())
    records = []

    for _ in range(n):
        cat = np.random.choice(categories)
        low, high = CATEGORY_PROFILES[cat]
        amount = np.random.lognormal(mean=np.log((low + high) / 2), sigma=0.4)
        amount = np.clip(amount, low * 0.5, high * 2)
        day = np.random.randint(0, 7)
        hour = int(np.random.normal(loc=14, scale=4))
        hour = np.clip(hour, 0, 23)
        records.append({"amount": round(float(amount), 2), "category": cat,
                        "day_of_week": int(day), "hour": int(hour)})

    # Inject ~5% anomalies
    n_anomalies = int(n * 0.05)
    for _ in range(n_anomalies):
        cat = np.random.choice(categories)
        anomaly_type = np.random.choice(["high_amount", "unusual_time", "both"])

        if anomaly_type in ("high_amount", "both"):
            amount = np.random.uniform(2000, 10000)
        else:
            _, high = CATEGORY_PROFILES[cat]
            amount = np.random.uniform(high, high * 3)

        if anomaly_type in ("unusual_time", "both"):
            hour = np.random.choice([0, 1, 2, 3, 4])
        else:
            hour = int(np.random.normal(loc=14, scale=4))
            hour = int(np.clip(hour, 0, 23))

        day = np.random.randint(0, 7)
        records.append({"amount": round(float(amount), 2), "category": cat,
                        "day_of_week": int(day), "hour": int(hour)})

    df = pd.DataFrame(records)
    np.random.shuffle(df.values)
    return df.reset_index(drop=True)


def _prepare_features(df: pd.DataFrame, label_encoder=None, fit_encoder=False):
    """
    Encode category and build feature matrix.

    Returns:
        X (ndarray), label_encoder
    """
    if label_encoder is None:
        label_encoder = LabelEncoder()

    df = df.copy()
    if fit_encoder:
        df["category_encoded"] = label_encoder.fit_transform(df["category"])
    else:
        # Handle unseen categories gracefully
        known = set(label_encoder.classes_)
        df["category_encoded"] = df["category"].apply(
            lambda x: label_encoder.transform([x])[0] if x in known else -1
        )

    X = df[["amount", "category_encoded", "day_of_week", "hour"]].values
    return X, label_encoder


def train(log_to_mlflow: bool = True) -> dict:
    """
    Train Isolation Forest on synthetic transaction data.

    Returns:
        Dictionary with model metrics.
    """
    # Generate data
    df = generate_synthetic_transactions(n=5000)
    X, label_encoder = _prepare_features(df, fit_encoder=True)

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    # Evaluate
    metrics = evaluate_anomaly_model(model, X)

    # Save
    joblib.dump({
        "model": model,
        "label_encoder": label_encoder,
        "metrics": metrics,
    }, MODEL_PATH)

    # MLflow logging
    if log_to_mlflow:
        try:
            from mlflow_setup import log_training_run
            log_training_run(
                experiment_name="anomaly-detector",
                params={"n_estimators": 200, "contamination": 0.05, "model_type": "IsolationForest"},
                metrics=metrics,
                artifact_path=MODEL_PATH,
                tag="manual",
            )
        except Exception as e:
            print(f"[anomaly_detector] MLflow logging skipped: {e}")

    print(f"[anomaly_detector] Trained: contamination_rate={metrics['contamination_rate']:.4f}")
    return {"metrics": metrics}


def detect(transactions: list[dict]) -> list[dict]:
    """
    Score a batch of transactions for anomalies.

    Args:
        transactions: List of dicts with keys: amount, category, day_of_week, hour.

    Returns:
        List of dicts with original fields + anomaly_score + is_anomaly.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("No trained model found. Run train() first.")

    saved = joblib.load(MODEL_PATH)
    model = saved["model"]
    label_encoder = saved["label_encoder"]

    df = pd.DataFrame(transactions)
    X, _ = _prepare_features(df, label_encoder=label_encoder, fit_encoder=False)

    # score_samples returns negative scores; more negative = more anomalous
    scores = model.score_samples(X)
    predictions = model.predict(X)

    results = []
    for i, txn in enumerate(transactions):
        results.append({
            **txn,
            "anomaly_score": round(float(scores[i]), 4),
            "is_anomaly": bool(predictions[i] == -1),
        })

    return results


def get_current_metrics() -> dict:
    """Load and return metrics from the saved model artifact."""
    if not os.path.exists(MODEL_PATH):
        return {"status": "no model trained"}
    saved = joblib.load(MODEL_PATH)
    return saved.get("metrics", {})


if __name__ == "__main__":
    result = train()
    print(f"\nTraining: {result}")

    test_txns = [
        {"amount": 25.50, "category": "groceries", "day_of_week": 3, "hour": 14},
        {"amount": 8500.00, "category": "dining", "day_of_week": 1, "hour": 2},
        {"amount": 45.00, "category": "transport", "day_of_week": 5, "hour": 10},
    ]
    detected = detect(test_txns)
    for d in detected:
        flag = "🚨 ANOMALY" if d["is_anomaly"] else "✅ Normal"
        print(f"  {flag} | ${d['amount']:.2f} {d['category']} score={d['anomaly_score']:.3f}")
