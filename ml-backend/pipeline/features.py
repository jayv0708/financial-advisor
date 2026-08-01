"""
features.py — Feature Engineering Module
==========================================
Computes technical indicators from raw OHLCV data for the stock predictor.

CRITICAL: No look-ahead bias. Every feature at time t uses only data at or before t.
The binary target (next-day direction) is shifted so the model never sees future returns.
"""

import pandas as pd
import numpy as np


def compute_rsi(series: pd.Series, window: int = 14) -> pd.Series:
    """
    Compute Relative Strength Index.

    RSI = 100 - (100 / (1 + RS))
    where RS = avg_gain / avg_loss over `window` periods.
    """
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.rolling(window=window, min_periods=window).mean()
    avg_loss = loss.rolling(window=window, min_periods=window).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def compute_macd(
    series: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    Compute MACD (Moving Average Convergence Divergence).

    Returns:
        macd_line, signal_line, histogram
    """
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()

    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line

    return macd_line, signal_line, histogram


def compute_bollinger_bands(
    series: pd.Series,
    window: int = 20,
    num_std: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    Compute Bollinger Bands.

    Returns:
        upper_band, lower_band, bandwidth (as % of middle band)
    """
    middle = series.rolling(window=window).mean()
    std = series.rolling(window=window).std()

    upper = middle + (num_std * std)
    lower = middle - (num_std * std)
    bandwidth = ((upper - lower) / middle) * 100

    return upper, lower, bandwidth


def compute_moving_averages(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add 5, 20, and 50-day Simple Moving Averages of Close price.
    Also adds the ratio of Close to each MA (a normalized signal).
    """
    for window in [5, 20, 50]:
        col_name = f"sma_{window}"
        df[col_name] = df["Close"].rolling(window=window).mean()
        df[f"close_to_sma_{window}"] = df["Close"] / df[col_name]
    return df


def compute_volume_ratio(df: pd.DataFrame, window: int = 20) -> pd.Series:
    """
    Compute volume ratio = today's volume / 20-day average volume.
    Values > 1 indicate above-average activity.
    """
    avg_volume = df["Volume"].rolling(window=window).mean()
    return df["Volume"] / avg_volume.replace(0, np.nan)


def build_feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build the full feature matrix from raw OHLCV data.
    Adds all technical indicators and a binary target column.

    Target: 'target' = 1 if next-day Close > today's Close, else 0.

    IMPORTANT: The target is created by shifting FUTURE returns back,
    then the last row (which has NaN target) is dropped. This prevents
    look-ahead bias because:
    - Features at row t use data at or before t.
    - Target at row t is the return from t to t+1 (known only at t+1).
    """
    df = df.copy()

    # --- Technical Indicators (all backward-looking) ---
    df["rsi"] = compute_rsi(df["Close"])

    macd_line, signal_line, histogram = compute_macd(df["Close"])
    df["macd"] = macd_line
    df["macd_signal"] = signal_line
    df["macd_hist"] = histogram

    upper, lower, bandwidth = compute_bollinger_bands(df["Close"])
    df["bb_upper"] = upper
    df["bb_lower"] = lower
    df["bb_bandwidth"] = bandwidth
    df["bb_position"] = (df["Close"] - lower) / (upper - lower)  # 0=at lower, 1=at upper

    df = compute_moving_averages(df)
    df["volume_ratio"] = compute_volume_ratio(df)

    # Daily return (backward-looking)
    df["daily_return"] = df["Close"].pct_change()

    # --- Target Variable (FUTURE-looking — this is what we predict) ---
    # Shift returns so target[t] = 1 if Close[t+1] > Close[t]
    df["target"] = (df["Close"].shift(-1) > df["Close"]).astype(int)

    # --- Clean up ---
    # Drop rows with NaN from rolling windows and the last row (no target)
    feature_columns = [
        "rsi", "macd", "macd_signal", "macd_hist",
        "bb_bandwidth", "bb_position",
        "sma_5", "sma_20", "sma_50",
        "close_to_sma_5", "close_to_sma_20", "close_to_sma_50",
        "volume_ratio", "daily_return"
    ]

    df = df.dropna(subset=feature_columns + ["target"])

    return df, feature_columns


if __name__ == "__main__":
    # Quick test with synthetic data
    from ingest import fetch_stock_data

    df = fetch_stock_data("AAPL", period="1y")
    df_features, feature_cols = build_feature_matrix(df)
    print(f"Feature matrix shape: {df_features.shape}")
    print(f"Features: {feature_cols}")
    print(f"Target distribution:\n{df_features['target'].value_counts()}")
    print(df_features[feature_cols + ["target"]].tail())
