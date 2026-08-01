"""
test_features.py — Unit tests for feature engineering functions.
=================================================================
Tests RSI, MACD, and Bollinger Band calculations against known values.
"""

import numpy as np
import pandas as pd
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pipeline.features import (
    compute_rsi,
    compute_macd,
    compute_bollinger_bands,
    compute_volume_ratio,
    build_feature_matrix,
)


@pytest.fixture
def sample_prices():
    """Generate a simple uptrending price series for testing."""
    np.random.seed(42)
    prices = 100 + np.cumsum(np.random.randn(100) * 0.5)
    return pd.Series(prices)


@pytest.fixture
def sample_ohlcv():
    """Generate a sample OHLCV DataFrame."""
    np.random.seed(42)
    n = 200
    close = 100 + np.cumsum(np.random.randn(n) * 0.5)
    dates = pd.date_range("2023-01-01", periods=n, freq="B")
    return pd.DataFrame({
        "Date": dates,
        "Open": close - np.random.uniform(0, 1, n),
        "High": close + np.random.uniform(0, 2, n),
        "Low": close - np.random.uniform(0, 2, n),
        "Close": close,
        "Volume": np.random.randint(1000000, 10000000, n),
    })


class TestRSI:
    def test_rsi_returns_series(self, sample_prices):
        rsi = compute_rsi(sample_prices)
        assert isinstance(rsi, pd.Series)
        assert len(rsi) == len(sample_prices)

    def test_rsi_bounded_0_100(self, sample_prices):
        rsi = compute_rsi(sample_prices).dropna()
        assert rsi.min() >= 0
        assert rsi.max() <= 100

    def test_rsi_has_nan_for_warmup(self, sample_prices):
        rsi = compute_rsi(sample_prices, window=14)
        # With min_periods=window, the first valid value appears at index (window-1).
        # So indices 0..(window-2) = 0..12 must all be NaN.
        assert rsi.iloc[:13].isna().all()
        # And the value at index (window-1) = 13 should NOT be NaN.
        assert not pd.isna(rsi.iloc[13])


class TestMACD:
    def test_macd_returns_three_series(self, sample_prices):
        macd_line, signal_line, histogram = compute_macd(sample_prices)
        assert isinstance(macd_line, pd.Series)
        assert isinstance(signal_line, pd.Series)
        assert isinstance(histogram, pd.Series)

    def test_histogram_equals_macd_minus_signal(self, sample_prices):
        macd_line, signal_line, histogram = compute_macd(sample_prices)
        diff = (macd_line - signal_line).dropna()
        hist_clean = histogram.dropna()
        np.testing.assert_array_almost_equal(diff.values, hist_clean.values, decimal=10)


class TestBollingerBands:
    def test_upper_above_lower(self, sample_prices):
        upper, lower, bandwidth = compute_bollinger_bands(sample_prices)
        valid = upper.dropna().index
        assert (upper[valid] >= lower[valid]).all()

    def test_bandwidth_positive(self, sample_prices):
        _, _, bandwidth = compute_bollinger_bands(sample_prices)
        bw_clean = bandwidth.dropna()
        assert (bw_clean >= 0).all()


class TestVolumeRatio:
    def test_volume_ratio_shape(self, sample_ohlcv):
        vr = compute_volume_ratio(sample_ohlcv)
        assert len(vr) == len(sample_ohlcv)

    def test_volume_ratio_positive(self, sample_ohlcv):
        vr = compute_volume_ratio(sample_ohlcv).dropna()
        assert (vr > 0).all()


class TestBuildFeatureMatrix:
    def test_returns_dataframe_and_columns(self, sample_ohlcv):
        df, feature_cols = build_feature_matrix(sample_ohlcv)
        assert isinstance(df, pd.DataFrame)
        assert isinstance(feature_cols, list)
        assert len(feature_cols) > 0

    def test_no_nans_in_features(self, sample_ohlcv):
        df, feature_cols = build_feature_matrix(sample_ohlcv)
        assert df[feature_cols].isna().sum().sum() == 0

    def test_target_is_binary(self, sample_ohlcv):
        df, _ = build_feature_matrix(sample_ohlcv)
        assert set(df["target"].unique()).issubset({0, 1})

    def test_has_expected_features(self, sample_ohlcv):
        _, feature_cols = build_feature_matrix(sample_ohlcv)
        assert "rsi" in feature_cols
        assert "macd" in feature_cols
        assert "bb_bandwidth" in feature_cols
        assert "volume_ratio" in feature_cols
