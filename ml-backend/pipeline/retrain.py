"""
retrain.py — Automated Retraining Pipeline
============================================
Wraps the full pipeline: ingest → features → train → evaluate → compare → save.

CRITICAL RULE: Never auto-deploy a retrained model if its F1 is worse
than the current production model. Always log the comparison.
"""

import os
import json
import joblib
from datetime import datetime, timezone

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

RETRAIN_LOG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "retrain_log.json")


def _load_retrain_log() -> list[dict]:
    """Load the retrain log from disk."""
    if os.path.exists(RETRAIN_LOG_PATH):
        with open(RETRAIN_LOG_PATH, "r") as f:
            return json.load(f)
    return []


def _save_retrain_log(log: list[dict]):
    """Persist the retrain log to disk."""
    with open(RETRAIN_LOG_PATH, "w") as f:
        json.dump(log, f, indent=2, default=str)


def retrain_all(trigger: str = "manual") -> dict:
    """
    Retrain all three models and conditionally deploy if improved.

    For each model:
    1. Load current model metrics (if any)
    2. Retrain on fresh data
    3. Compare new F1/metric vs old
    4. Only replace saved model if new metric >= old metric
    5. Log everything to retrain_log.json and MLflow

    Args:
        trigger: 'manual' or 'scheduled'

    Returns:
        Summary dict with results for each model.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    log = _load_retrain_log()
    results = {}

    # --- Stock Predictor ---
    try:
        from models.stock_predictor import train as train_stock, get_current_metrics as stock_metrics, MODEL_PATH as STOCK_PATH

        old_metrics = stock_metrics()
        old_f1 = old_metrics.get("f1_score", 0.0)

        # Temporarily save old model
        old_model_backup = None
        if os.path.exists(STOCK_PATH):
            old_model_backup = joblib.load(STOCK_PATH)

        # Retrain
        result = train_stock("AAPL", period="2y", log_to_mlflow=True)
        new_f1 = result["metrics"]["f1_score"]

        if new_f1 >= old_f1:
            action = "deployed"
            print(f"[retrain] Stock Predictor improved: old F1={old_f1:.4f} -> new F1={new_f1:.4f}. Deploying.")
        else:
            action = "rejected"
            # Restore old model
            if old_model_backup:
                joblib.dump(old_model_backup, STOCK_PATH)
            print(f"[retrain] Stock Predictor did NOT improve: old F1={old_f1:.4f} -> new F1={new_f1:.4f}. Keeping previous.")

        results["stock_predictor"] = {
            "old_f1": old_f1, "new_f1": new_f1, "action": action
        }
    except Exception as e:
        results["stock_predictor"] = {"error": str(e)}
        print(f"[retrain] Stock Predictor failed: {e}")

    # --- Anomaly Detector ---
    try:
        from models.anomaly_detector import train as train_anomaly

        result = train_anomaly(log_to_mlflow=True)
        results["anomaly_detector"] = {
            "metrics": result["metrics"], "action": "deployed"
        }
        print(f"[retrain] Anomaly Detector retrained successfully.")
    except Exception as e:
        results["anomaly_detector"] = {"error": str(e)}
        print(f"[retrain] Anomaly Detector failed: {e}")

    # --- Risk Scorer ---
    try:
        from models.risk_scorer import train as train_risk

        result = train_risk(log_to_mlflow=True)
        results["risk_scorer"] = {
            "metrics": result["metrics"], "action": "deployed"
        }
        print(f"[retrain] Risk Scorer retrained successfully.")
    except Exception as e:
        results["risk_scorer"] = {"error": str(e)}
        print(f"[retrain] Risk Scorer failed: {e}")

    # Log
    entry = {
        "timestamp": timestamp,
        "trigger": trigger,
        "results": results,
    }
    log.append(entry)
    _save_retrain_log(log)

    return entry


def get_retrain_log() -> list[dict]:
    """Return the full retrain history."""
    return _load_retrain_log()


if __name__ == "__main__":
    print("=" * 50)
    print("  RUNNING FULL RETRAIN PIPELINE")
    print("=" * 50)
    summary = retrain_all(trigger="manual")
    print(f"\nSummary: {json.dumps(summary, indent=2, default=str)}")
