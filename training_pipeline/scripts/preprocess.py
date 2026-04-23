"""
preprocess.py
=============
Handles all data preprocessing for the Finance Advisor ML pipeline.
 
Steps:
  1. Text cleaning: lowercase, strip punctuation, remove stopwords
  2. TF-IDF vectorization for transaction text classification
  3. Feature engineering for regression (time index, lag features)
  4. Feature engineering for market trend (price change %, volatility, momentum)
"""

import re
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import Tuple, List


# ---------------------------------------------------------------------------
# Text Cleaning
# ---------------------------------------------------------------------------

# Common Hindi/English stopwords found in Indian transaction text
STOPWORDS = {"a", "an", "the", "for", "to", "of", "in", "at", "by", "from",
             "on", "with", "is", "and", "or", "it", "my", "i", "me", "was"}


def clean_text(text: str) -> str:
    """Lowercase, strip punctuation, remove stopwords."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)   # remove punctuation
    tokens = text.split()
    tokens = [t for t in tokens if t not in STOPWORDS and len(t) > 1]
    return " ".join(tokens)


def load_and_clean_transactions(filepath: str) -> pd.DataFrame:
    """Load CSV, apply text cleaning, return DataFrame."""
    df = pd.read_csv(filepath)
    df["clean_text"] = df["text"].fillna("").apply(clean_text)
    return df


# ---------------------------------------------------------------------------
# TF-IDF Vectorizer Factory
# ---------------------------------------------------------------------------

def build_tfidf_vectorizer(max_features: int = 500) -> TfidfVectorizer:
    """
    Create a TF-IDF vectorizer.
    max_features limits vocabulary size → keeps the exported JSON small
    for browser inference.
    """
    return TfidfVectorizer(
        max_features=max_features,
        ngram_range=(1, 2),       # unigrams + bigrams capture 'swiggy order'
        min_df=1,
        sublinear_tf=True          # log-scale TF to dampen high-frequency words
    )


# ---------------------------------------------------------------------------
# Regression Feature Engineering
# ---------------------------------------------------------------------------

def build_regression_features(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    """
    Prepare features for monthly spending regression:
      X = [month_index, month_index^2]  (adds slight curvature)
      y = total_spending
    """
    X = df["month_index"].values.reshape(-1, 1)
    # Add polynomial feature for better curve fitting
    X_poly = np.hstack([X, X**2])
    y = df["total_spending"].values
    return X_poly, y


# ---------------------------------------------------------------------------
# Market Trend Feature Engineering 
# ---------------------------------------------------------------------------

def build_trend_features(prices: List[float]) -> np.ndarray:
    """
    Convert a price sequence into meaningful statistical features:
      - price_change_pct   : % change first → last
      - volatility         : std deviation / mean  (coefficient of variation)
      - momentum_3m        : average % change over last 3 periods
      - momentum_6m        : average % change over last 6 periods
    
    Returns shape (1, 4) array — single feature row for one asset.
    """
    prices = np.array(prices, dtype=float)
    if len(prices) < 2:
        return np.zeros((1, 4))

    price_change_pct = (prices[-1] - prices[0]) / prices[0] * 100
    volatility = np.std(prices) / np.mean(prices) * 100

    # Period-wise changes
    pct_changes = np.diff(prices) / prices[:-1] * 100

    momentum_3m = np.mean(pct_changes[-3:]) if len(pct_changes) >= 3 else np.mean(pct_changes)
    momentum_6m = np.mean(pct_changes[-6:]) if len(pct_changes) >= 6 else np.mean(pct_changes)

    return np.array([[price_change_pct, volatility, momentum_3m, momentum_6m]])


def build_trend_dataset(market_df: pd.DataFrame, window: int = 6):
    """
    Build a supervised dataset for trend classification.
    For each window of 'window' months → predict the trend label of the LAST month.
    
    Columns expected: gold_price_per_10g, nifty50, bitcoin_inr
    Labels expected:  gold_label, nifty50_label, bitcoin_label
    """
    X_rows, y_rows = [], []
    ASSETS = [
        ("gold_price_per_10g", "gold_label"),
        ("nifty50", "nifty50_label"),
        ("bitcoin_inr", "bitcoin_label"),
    ]

    for price_col, label_col in ASSETS:
        for i in range(window, len(market_df)):
            window_prices = market_df[price_col].iloc[i - window: i].tolist()
            features = build_trend_features(window_prices)[0]  # shape (4,)
            label = market_df[label_col].iloc[i]
            X_rows.append(features)
            y_rows.append(label)

    return np.array(X_rows), np.array(y_rows)
