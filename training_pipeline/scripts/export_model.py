"""
export_model.py
===============
Exports all trained sklearn models to JSON format for browser inference.
NO binary serialization (no .pkl) — only plain JSON so the React frontend
can load and run inference without any Python server.

EXPORT FORMAT
─────────────
classifier_model_v1.json:
  - vocabulary     : {word: index}
  - idf            : [float, ...] (IDF weights per vocab word)
  - classes        : ["Bills", "Food", ...]
  - coef           : [[...per-class weights...]]
  - intercept      : [float per class]

regression_model_v1.json:
  - coef           : [slope1, slope2] (polynomial features)
  - intercept      : float
  - n_training_months: int (so frontend knows what "next month" index is)

trend_model_v1.json:
  - scaler_mean    : [float]
  - scaler_scale   : [float]
  - classes        : ["Downtrend", "Stable", "Uptrend"]
  - coef           : [[per-class weights]]
  - intercept      : [float per class]
  - feature_names  : [str]
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import json
import numpy as np
import pandas as pd
from datetime import datetime

from train_classifier import train_classifier
from train_regressor import train_regressor
from train_trend_model import train_trend_model
from preprocess import build_regression_features

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
FRONTEND_PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "public", "models")
DATA_MONTHLY = os.path.join(os.path.dirname(__file__), "..", "data", "monthly_spending.csv")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(FRONTEND_PUBLIC_DIR, exist_ok=True)

VERSION = "v1"
TIMESTAMP = datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def export_classifier(pipeline, version: str):
    """Extract TF-IDF weights + LogReg coefficients from the pipeline and write JSON."""
    tfidf = pipeline.named_steps["tfidf"]
    clf   = pipeline.named_steps["clf"]

    payload = {
        "metadata": {
            "version": version,
            "type": "tfidf_logistic_regression",
            "trained_at": TIMESTAMP,
            "description": "Expense category classifier. Input: transaction text string. Output: category probabilities."
        },
        # vocabulary: {word: column_index}
        "vocabulary": {k: int(v) for k, v in tfidf.vocabulary_.items()},
        # IDF weights (one per vocab word, index-aligned with vocabulary)
        "idf": tfidf.idf_.tolist(),
        "classes": list(clf.classes_),
        # coef shape: [n_classes, n_features]
        "coef": clf.coef_.tolist(),
        "intercept": clf.intercept_.tolist()
    }

    filename = f"classifier_model_{version}.json"
    for output_dir in [MODELS_DIR, FRONTEND_PUBLIC_DIR]:
        path = os.path.join(output_dir, filename)
        with open(path, "w") as f:
            json.dump(payload, f, indent=2)
        print(f"  [OK] Saved classifier -> {path}")

    return payload


def export_regressor(model, n_months: int, version: str):
    """Export linear regression coefficients."""
    payload = {
        "metadata": {
            "version": version,
            "type": "polynomial_linear_regression",
            "trained_at": TIMESTAMP,
            "description": "Monthly spending predictor. Input: [month_index, month_index^2]. Output: predicted INR spend."
        },
        "coef": model.coef_.tolist(),
        "intercept": float(model.intercept_),
        "n_training_months": n_months
    }

    filename = f"regression_model_{version}.json"
    for output_dir in [MODELS_DIR, FRONTEND_PUBLIC_DIR]:
        path = os.path.join(output_dir, filename)
        with open(path, "w") as f:
            json.dump(payload, f, indent=2)
        print(f"  [OK] Saved regressor  -> {path}")

    return payload


def export_trend_model(pipeline, version: str):
    """Export scaler stats + LogReg weights for market trend classifier."""
    scaler = pipeline.named_steps["scaler"]
    clf    = pipeline.named_steps["clf"]

    payload = {
        "metadata": {
            "version": version,
            "type": "logistic_regression_trend",
            "trained_at": TIMESTAMP,
            "description": "Market trend classifier. Input: 4 statistical features from price history. Output: Uptrend / Stable / Downtrend."
        },
        "feature_names": ["price_change_pct", "volatility", "momentum_3m", "momentum_6m"],
        "scaler_mean":   scaler.mean_.tolist(),
        "scaler_scale":  scaler.scale_.tolist(),
        "classes":       list(clf.classes_),
        "coef":          clf.coef_.tolist(),
        "intercept":     clf.intercept_.tolist()
    }

    filename = f"trend_model_{version}.json"
    for output_dir in [MODELS_DIR, FRONTEND_PUBLIC_DIR]:
        path = os.path.join(output_dir, filename)
        with open(path, "w") as f:
            json.dump(payload, f, indent=2)
        print(f"  [OK] Saved trend model -> {path}")

    return payload


def main():
    print("\n" + "=" * 50)
    print("  EXPORTING ALL MODELS TO JSON")
    print("=" * 50 + "\n")

    print("[1/3] Training + Exporting Expense Classifier...")
    clf_pipeline = train_classifier()
    export_classifier(clf_pipeline, VERSION)

    print("\n[2/3] Training + Exporting Spending Regressor...")
    reg_model, n_months = train_regressor()
    export_regressor(reg_model, n_months, VERSION)

    print("\n[3/3] Training + Exporting Market Trend Classifier...")
    trend_pipeline = train_trend_model()
    export_trend_model(trend_pipeline, VERSION)

    print("\n" + "=" * 50)
    print(f"  ALL MODELS EXPORTED (version {VERSION})")
    print(f"  Python models : training_pipeline/models/")
    print(f"  Frontend copy : public/models/")
    print("=" * 50)


if __name__ == "__main__":
    main()
