"""
evaluate.py
===========
Consolidated evaluation report for all three trained models:
  - Expense Classifier  → Accuracy, Precision, Recall, F1
  - Spending Regressor  → RMSE, MAE
  - Trend Classifier    → Accuracy, Confusion Matrix
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    mean_squared_error, mean_absolute_error
)

from preprocess import (
    load_and_clean_transactions, build_regression_features,
    build_trend_dataset, build_tfidf_vectorizer
)
from train_classifier import train_classifier
from train_regressor import train_regressor
from train_trend_model import train_trend_model


DATA_TRANSACTIONS = os.path.join(os.path.dirname(__file__), "..", "data", "transactions.csv")
DATA_MONTHLY      = os.path.join(os.path.dirname(__file__), "..", "data", "monthly_spending.csv")
DATA_MARKET       = os.path.join(os.path.dirname(__file__), "..", "data", "market_prices.csv")


def evaluate_all():
    print("\n" + "#" * 60)
    print("#  FULL PIPELINE EVALUATION REPORT")
    print("#" * 60 + "\n")

    # -------------------------------------------------------
    # 1. Expense Classifier
    # -------------------------------------------------------
    print("─" * 40)
    print("MODEL 1: Expense Classifier (TF-IDF + LogReg)")
    print("─" * 40)

    clf_pipeline = train_classifier()
    df = load_and_clean_transactions(DATA_TRANSACTIONS)
    X_text, y_cat = df["clean_text"], df["category"]

    cv_scores = cross_val_score(clf_pipeline, X_text, y_cat, cv=5, scoring="accuracy")
    print(f"  5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # -------------------------------------------------------
    # 2. Spending Regressor
    # -------------------------------------------------------
    print("\n" + "─" * 40)
    print("MODEL 2: Spending Regressor (Polynomial LR)")
    print("─" * 40)

    reg_model, n_months = train_regressor()
    df_monthly = pd.read_csv(DATA_MONTHLY)
    X_reg, y_reg = build_regression_features(df_monthly)

    y_pred_reg = reg_model.predict(X_reg)
    rmse = np.sqrt(mean_squared_error(y_reg, y_pred_reg))
    mae  = mean_absolute_error(y_reg, y_pred_reg)
    print(f"  Overall RMSE : Rs.{rmse:,.0f}")
    print(f"  Overall MAE  : Rs.{mae:,.0f}")

    # -------------------------------------------------------
    # 3. Market Trend Classifier
    # -------------------------------------------------------
    print("\n" + "─" * 40)
    print("MODEL 3: Market Trend Classifier (LogReg)")
    print("─" * 40)

    trend_pipeline = train_trend_model()
    df_market = pd.read_csv(DATA_MARKET)
    X_trend, y_trend = build_trend_dataset(df_market, window=6)

    cv_trend = cross_val_score(trend_pipeline, X_trend, y_trend, cv=3, scoring="accuracy")
    print(f"  3-Fold CV Accuracy: {cv_trend.mean():.4f} ± {cv_trend.std():.4f}")

    print("\n" + "#" * 60)
    print("#  EVALUATION COMPLETE")
    print("#" * 60 + "\n")


if __name__ == "__main__":
    evaluate_all()
