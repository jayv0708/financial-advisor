"""
test_retrain.py — Tests for the retraining pipeline logic.
============================================================
Validates that retraining never deploys a worse model.
"""

import pytest
import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestRetrainLogic:
    """Test that the retrain pipeline handles model comparison correctly."""

    def test_retrain_log_is_list(self):
        from pipeline.retrain import get_retrain_log
        log = get_retrain_log()
        assert isinstance(log, list)

    def test_retrain_produces_results(self):
        """Run a full retrain and verify the output structure."""
        from pipeline.retrain import retrain_all

        result = retrain_all(trigger="test")
        assert isinstance(result, dict)
        assert "timestamp" in result
        assert "trigger" in result
        assert result["trigger"] == "test"
        assert "results" in result

    def test_retrain_logs_to_file(self):
        """Verify retrain appends to the log file."""
        from pipeline.retrain import get_retrain_log

        log = get_retrain_log()
        # After previous test, there should be at least 1 entry
        assert len(log) >= 1

        latest = log[-1]
        assert "timestamp" in latest
        assert "results" in latest

    def test_retrain_stock_has_action(self):
        """Verify stock predictor retrain has a deploy/reject action."""
        from pipeline.retrain import get_retrain_log

        log = get_retrain_log()
        if not log:
            pytest.skip("No retrain log entries.")

        latest = log[-1]
        stock = latest["results"].get("stock_predictor", {})
        # Should have either 'action' or 'error'
        assert "action" in stock or "error" in stock

    def test_never_deploys_worse_model(self):
        """
        The retrain logic should never deploy a model with lower F1.
        We verify by checking the retrain log for any 'rejected' entries —
        those indicate the safeguard worked correctly.
        """
        from pipeline.retrain import get_retrain_log

        log = get_retrain_log()
        for entry in log:
            stock = entry["results"].get("stock_predictor", {})
            if stock.get("action") == "rejected":
                # Safeguard worked: new F1 was worse than old
                assert stock["new_f1"] < stock["old_f1"]
            elif stock.get("action") == "deployed":
                # Deployment was justified: new F1 >= old
                assert stock["new_f1"] >= stock["old_f1"]
