"""
test_predict.py — Tests for the /predict API endpoint schema.
==============================================================
Validates that the prediction endpoint returns the expected JSON structure.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestStockPredictorSchema:
    """Test that the stock predictor returns valid output structure."""

    def test_predict_returns_dict(self):
        from models.stock_predictor import predict, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found — run retrain first.")

        result = predict(ticker="AAPL", days=3)
        assert isinstance(result, dict)

    def test_predict_has_required_keys(self):
        from models.stock_predictor import predict, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        result = predict(ticker="AAPL", days=3)
        assert "ticker" in result
        assert "predictions" in result
        assert "feature_importances" in result
        assert "model_metrics" in result

    def test_predictions_list_length(self):
        from models.stock_predictor import predict, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        result = predict(ticker="AAPL", days=3)
        assert len(result["predictions"]) == 3

    def test_prediction_item_schema(self):
        from models.stock_predictor import predict, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        result = predict(ticker="AAPL", days=1)
        pred = result["predictions"][0]
        assert "date" in pred
        assert "direction" in pred
        assert pred["direction"] in ("up", "down")
        assert "confidence" in pred
        assert 0 <= pred["confidence"] <= 1


class TestAnomalyDetectorSchema:
    """Test that the anomaly detector returns valid output structure."""

    def test_detect_returns_list(self):
        from models.anomaly_detector import detect, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        txns = [{"amount": 25.0, "category": "groceries", "day_of_week": 3, "hour": 14}]
        result = detect(txns)
        assert isinstance(result, list)
        assert len(result) == 1

    def test_detect_item_has_anomaly_fields(self):
        from models.anomaly_detector import detect, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        txns = [{"amount": 25.0, "category": "groceries", "day_of_week": 3, "hour": 14}]
        result = detect(txns)
        item = result[0]
        assert "anomaly_score" in item
        assert "is_anomaly" in item
        assert isinstance(item["is_anomaly"], bool)

    def test_extreme_amount_flagged(self):
        from models.anomaly_detector import detect, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        txns = [{"amount": 9999.0, "category": "dining", "day_of_week": 1, "hour": 2}]
        result = detect(txns)
        # An extreme amount at 2am should likely be flagged
        assert result[0]["is_anomaly"] is True


class TestRiskScorerSchema:
    """Test that the risk scorer returns valid output structure."""

    def test_score_returns_dict(self):
        from models.risk_scorer import score, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        portfolio = [
            {"ticker": "AAPL", "weight": 0.5},
            {"ticker": "MSFT", "weight": 0.5},
        ]
        result = score(portfolio)
        assert isinstance(result, dict)

    def test_score_has_required_keys(self):
        from models.risk_scorer import score, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        portfolio = [
            {"ticker": "AAPL", "weight": 0.5},
            {"ticker": "MSFT", "weight": 0.5},
        ]
        result = score(portfolio)
        assert "risk_score" in result
        assert "risk_level" in result
        assert "sharpe_ratio" in result
        assert "annualized_volatility" in result

    def test_risk_score_bounded(self):
        from models.risk_scorer import score, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        portfolio = [
            {"ticker": "AAPL", "weight": 0.5},
            {"ticker": "MSFT", "weight": 0.5},
        ]
        result = score(portfolio)
        assert 0 <= result["risk_score"] <= 100

    def test_risk_level_valid(self):
        from models.risk_scorer import score, MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            pytest.skip("No trained model found.")

        portfolio = [
            {"ticker": "AAPL", "weight": 0.5},
            {"ticker": "MSFT", "weight": 0.5},
        ]
        result = score(portfolio)
        assert result["risk_level"] in ("Low", "Medium", "High")
