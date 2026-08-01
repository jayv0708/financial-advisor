"""
evaluate.py — Model Evaluation Module
=======================================
Standardized evaluation functions for all three models.
Metrics are returned as dictionaries for easy MLflow logging.
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    classification_report,
    mean_absolute_error,
    r2_score,
)


def evaluate_stock_model(y_true, y_pred) -> dict:
    """
    Evaluate stock direction predictor (binary classification).

    Returns:
        Dictionary with accuracy, f1, precision, recall.
    """
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1_score": float(f1_score(y_true, y_pred, average="binary")),
        "precision": float(precision_score(y_true, y_pred, average="binary")),
        "recall": float(recall_score(y_true, y_pred, average="binary")),
    }


def evaluate_anomaly_model(model, X) -> dict:
    """
    Evaluate Isolation Forest anomaly detector.

    Returns:
        Dictionary with contamination rate and anomaly count.
    """
    predictions = model.predict(X)
    n_anomalies = int((predictions == -1).sum())
    total = len(predictions)

    return {
        "contamination_rate": float(n_anomalies / total) if total > 0 else 0.0,
        "n_anomalies": n_anomalies,
        "n_total": total,
    }


def evaluate_risk_model(y_true, y_pred) -> dict:
    """
    Evaluate portfolio risk scorer (regression).

    Returns:
        Dictionary with R², MAE.
    """
    return {
        "r2_score": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
    }
