"""
train_regressor.py
==================
Trains a Monthly Spending Regressor using:
  - Polynomial features (month index, month index^2)
  - Linear Regression (OLS)

Pipeline:
  month_index -> polynomial features -> LinearRegression -> predicted INR spend

Output:
  Fitted model, ready for export_model.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error

from preprocess import build_regression_features


DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "monthly_spending.csv")


def train_regressor():
    """
    Train a polynomial linear regression on the monthly spending time series.
    Returns the fitted LinearRegression model and fitted feature matrix.
    """
    print("=" * 50)
    print("TRAINING: Monthly Spending Regressor")
    print("=" * 50)

    # 1. Load data
    df = pd.read_csv(DATA_PATH)
    print(f"  Loaded {len(df)} monthly records spanning {df['month_label'].iloc[0]} -> {df['month_label'].iloc[-1]}\n")

    X, y = build_regression_features(df)

    # 2. Train/test split (last 4 months as test — realistic walk-forward evaluation)
    split = len(df) - 4
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    # 3. Fit LinearRegression on polynomial features
    model = LinearRegression()
    model.fit(X_train, y_train)

    # 4. Evaluate
    y_pred_train = model.predict(X_train)
    y_pred_test  = model.predict(X_test)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    test_rmse  = np.sqrt(mean_squared_error(y_test, y_pred_test))

    print(f"  Train RMSE : Rs.{train_rmse:,.0f}")
    print(f"  Test  RMSE : Rs.{test_rmse:,.0f}")
    print(f"  Coefficients   : {model.coef_}")
    print(f"  Intercept      : {model.intercept_:.2f}\n")

    return model, len(df)  # return model + total months (for next-month index prediction)


if __name__ == "__main__":
    train_regressor()
