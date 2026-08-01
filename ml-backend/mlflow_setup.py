"""
mlflow_setup.py — MLflow Configuration & Experiment Tracking
=============================================================
Configures MLflow tracking URI, creates named experiments,
and provides a helper function to log any training run.

All experiments are stored locally in ./mlruns for development.
"""

import os
import mlflow
from mlflow.tracking import MlflowClient

# Set tracking URI to local directory
MLRUNS_DIR = os.path.join(os.path.dirname(__file__), "mlruns")
os.makedirs(MLRUNS_DIR, exist_ok=True)
mlflow.set_tracking_uri(f"file:///{MLRUNS_DIR.replace(os.sep, '/')}")

# Named experiments
EXPERIMENTS = ["stock-predictor", "anomaly-detector", "risk-scorer"]


def init_experiments():
    """Create named MLflow experiments if they don't already exist."""
    client = MlflowClient()
    for name in EXPERIMENTS:
        exp = client.get_experiment_by_name(name)
        if exp is None:
            client.create_experiment(name)
            print(f"[mlflow] Created experiment: {name}")


def log_training_run(
    experiment_name: str,
    params: dict,
    metrics: dict,
    artifact_path: str | None = None,
    tag: str = "manual",
):
    """
    Log a complete training run to MLflow.

    Args:
        experiment_name: One of 'stock-predictor', 'anomaly-detector', 'risk-scorer'.
        params: Hyperparameters dict.
        metrics: Evaluation metrics dict.
        artifact_path: Path to the model .joblib file to log.
        tag: 'manual' or 'scheduled' to indicate trigger source.
    """
    mlflow.set_experiment(experiment_name)

    with mlflow.start_run():
        # Log parameters
        for k, v in params.items():
            mlflow.log_param(k, v)

        # Log metrics
        for k, v in metrics.items():
            if isinstance(v, (int, float)):
                mlflow.log_metric(k, v)

        # Log artifact
        if artifact_path and os.path.exists(artifact_path):
            mlflow.log_artifact(artifact_path)

        # Tag
        mlflow.set_tag("retrain_trigger", tag)


def get_recent_runs(experiment_name: str, max_results: int = 10) -> list[dict]:
    """
    Retrieve the last N runs for a given experiment.

    Returns:
        List of dicts with run_id, params, metrics, start_time.
    """
    client = MlflowClient()
    exp = client.get_experiment_by_name(experiment_name)
    if exp is None:
        return []

    runs = client.search_runs(
        experiment_ids=[exp.experiment_id],
        order_by=["start_time DESC"],
        max_results=max_results,
    )

    results = []
    for run in runs:
        results.append({
            "run_id": run.info.run_id,
            "status": run.info.status,
            "start_time": run.info.start_time,
            "params": dict(run.data.params),
            "metrics": {k: round(v, 4) for k, v in run.data.metrics.items()},
            "tags": dict(run.data.tags),
        })

    return results


def get_best_run(experiment_name: str, metric: str = "f1_score") -> dict | None:
    """
    Find the best run by a specific metric for a given experiment.

    Returns:
        Dict with run details, or None if no runs exist.
    """
    client = MlflowClient()
    exp = client.get_experiment_by_name(experiment_name)
    if exp is None:
        return None

    runs = client.search_runs(
        experiment_ids=[exp.experiment_id],
        order_by=[f"metrics.{metric} DESC"],
        max_results=1,
    )

    if not runs:
        return None

    run = runs[0]
    return {
        "run_id": run.info.run_id,
        "start_time": run.info.start_time,
        "params": dict(run.data.params),
        "metrics": {k: round(v, 4) for k, v in run.data.metrics.items()},
    }


# Initialize experiments on import
try:
    init_experiments()
except Exception as e:
    print(f"[mlflow] Warning: Could not initialize experiments: {e}")
