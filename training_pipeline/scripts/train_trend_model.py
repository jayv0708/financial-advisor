"""
train_trend_model.py
====================
Trains a Market Trend Classifier using:
  - Statistical features: price_change_pct, volatility, momentum_3m, momentum_6m
  - Logistic Regression (3-class: Uptrend / Stable / Downtrend)

Pipeline:
  price sequence → 4 statistical features → LogisticRegression → trend label

The approach is explainable: each feature has a clear financial meaning.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from preprocess import build_trend_dataset


DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "market_prices.csv")


def train_trend_model() -> Pipeline:
    """
    Build and train a market trend classifier from historical price windows.
    Returns a fitted Pipeline (StandardScaler + LogisticRegression).
    """
    print("=" * 50)
    print("TRAINING: Market Trend Classifier")
    print("=" * 50)

    # 1. Load data and build supervised dataset
    df = pd.read_csv(DATA_PATH)
    X, y = build_trend_dataset(df, window=6)
    print(f"  Generated {len(X)} training samples from 3 assets × time windows")
    print(f"  Label distribution:\n{pd.Series(y).value_counts().to_string()}\n")

    # 2. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    # 3. Pipeline: StandardScaler normalizes features (e.g. BTC prices >> Gold prices numerically)
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=0.5,
            multi_class="multinomial",
            solver="lbfgs",
            random_state=42
        ))
    ])

    pipeline.fit(X_train, y_train)

    # 4. Evaluate
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Train accuracy : {pipeline.score(X_train, y_train):.4f}")
    print(f"  Test  accuracy : {acc:.4f}\n")
    print(classification_report(y_test, y_pred))

    return pipeline


if __name__ == "__main__":
    train_trend_model()
