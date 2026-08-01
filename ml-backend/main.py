"""
main.py — FastAPI Application Entry Point
===========================================
Production ML serving layer with CORS, Pydantic v2 schemas,
and all prediction, anomaly, risk, retrain, and MLflow endpoints.

Run with: uvicorn ml-backend.main:app --reload
"""

import os
import sys
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure ml-backend is on the path
sys.path.insert(0, os.path.dirname(__file__))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# ── Pydantic Schemas ─────────────────────────────────────────────

class PredictRequest(BaseModel):
    ticker: str = Field(default="AAPL", description="Stock ticker symbol")
    days: int = Field(default=5, ge=1, le=30, description="Number of days to predict")

class TransactionItem(BaseModel):
    amount: float
    category: str
    day_of_week: int = Field(ge=0, le=6)
    hour: int = Field(ge=0, le=23)

class AnomalyRequest(BaseModel):
    transactions: list[TransactionItem]

class PortfolioItem(BaseModel):
    ticker: str
    weight: float = Field(gt=0, le=1.0)

class RiskRequest(BaseModel):
    portfolio: list[PortfolioItem]

class TrainRequest(BaseModel):
    ticker: str = Field(default="AAPL")

class HealthResponse(BaseModel):
    status: str
    last_retrain: str | None
    uptime_seconds: float
    models_loaded: dict

class MetricsResponse(BaseModel):
    stock_predictor: dict
    anomaly_detector: dict
    risk_scorer: dict


# ── Application Lifecycle ────────────────────────────────────────

startup_time = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    global startup_time
    startup_time = datetime.now(timezone.utc)

    logger.info("Starting ML Backend...")

    # Initialize MLflow experiments
    try:
        from mlflow_setup import init_experiments
        init_experiments()
        logger.info("MLflow experiments initialized.")
    except Exception as e:
        logger.warning(f"MLflow init skipped: {e}")

    # Auto-train models if missing on startup
    try:
        artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
        stock_path = os.path.join(artifacts_dir, "stock_model.joblib")
        if not os.path.exists(stock_path):
            logger.info("Models not found on disk. Performing initial training...")
            from pipeline.retrain import retrain_all
            retrain_all(trigger="startup")
            logger.info("Initial models trained successfully.")
    except Exception as e:
        logger.warning(f"Initial model training failed: {e}")

    # Start background scheduler
    try:
        from scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler start skipped: {e}")

    yield  # Application runs

    # Shutdown
    try:
        from scheduler import stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    logger.info("ML Backend shutting down.")


# ── FastAPI App ──────────────────────────────────────────────────

app = FastAPI(
    title="Financial Advisor ML Backend",
    description="Production ML pipeline: Stock prediction, anomaly detection, portfolio risk scoring.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Service health status with last retrain timestamp."""
    from pipeline.retrain import get_retrain_log

    log = get_retrain_log()
    last_retrain = log[-1]["timestamp"] if log else None

    uptime = (datetime.now(timezone.utc) - startup_time).total_seconds() if startup_time else 0

    # Check which models exist on disk
    artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    models_loaded = {
        "stock_predictor": os.path.exists(os.path.join(artifacts_dir, "stock_model.joblib")),
        "anomaly_detector": os.path.exists(os.path.join(artifacts_dir, "anomaly_model.joblib")),
        "risk_scorer": os.path.exists(os.path.join(artifacts_dir, "risk_model.joblib")),
    }

    return HealthResponse(
        status="healthy",
        last_retrain=last_retrain,
        uptime_seconds=round(uptime, 1),
        models_loaded=models_loaded,
    )


@app.get("/metrics", response_model=MetricsResponse)
def get_metrics():
    """Current model performance statistics."""
    from models.stock_predictor import get_current_metrics as stock_m
    from models.anomaly_detector import get_current_metrics as anomaly_m
    from models.risk_scorer import get_current_metrics as risk_m

    return MetricsResponse(
        stock_predictor=stock_m(),
        anomaly_detector=anomaly_m(),
        risk_scorer=risk_m(),
    )


@app.post("/predict")
def predict_stock(request: PredictRequest):
    """
    Predict next-day stock direction (up/down) with confidence scores.

    Uses an XGBoost classifier trained with TimeSeriesSplit on technical indicators.
    """
    from models.stock_predictor import predict

    logger.info(f"POST /predict | ticker={request.ticker}, days={request.days}")

    try:
        result = predict(ticker=request.ticker, days=request.days)
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Stock model not trained yet. POST /retrain first.")
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/anomaly")
def detect_anomalies(request: AnomalyRequest):
    """
    Detect anomalous transactions using Isolation Forest.

    Returns each transaction with an anomaly_score and is_anomaly flag.
    """
    from models.anomaly_detector import detect

    logger.info(f"POST /anomaly | {len(request.transactions)} transactions")

    try:
        transactions = [t.model_dump() for t in request.transactions]
        result = detect(transactions)
        return {"results": result, "total": len(result),
                "anomalies_found": sum(1 for r in result if r["is_anomaly"])}
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Anomaly model not trained yet. POST /retrain first.")
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/risk")
def score_risk(request: RiskRequest):
    """
    Score portfolio risk on a 0–100 scale.

    Computes annualized return, volatility, Sharpe ratio, max drawdown,
    and a composite risk score using LinearRegression.
    """
    from models.risk_scorer import score

    portfolio = [p.model_dump() for p in request.portfolio]
    logger.info(f"POST /risk | portfolio={[p['ticker'] for p in portfolio]}")

    try:
        result = score(portfolio)
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Risk model not trained yet. POST /retrain first.")
    except Exception as e:
        logger.error(f"Risk scoring error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/retrain")
def trigger_retrain(background_tasks: BackgroundTasks):
    """
    Manually trigger a full retrain of all models.

    Retraining runs in the background. Check /retrain/log for results.
    """
    from pipeline.retrain import retrain_all

    logger.info("POST /retrain | Manual retrain triggered")

    def _run_retrain():
        try:
            retrain_all(trigger="manual")
        except Exception as e:
            logger.error(f"Background retrain failed: {e}")

    background_tasks.add_task(_run_retrain)
    return {"status": "Retrain started in background. Check /retrain/log for results."}


@app.get("/retrain/log")
def get_retrain_log():
    """Full retrain history with timestamps and metrics."""
    from pipeline.retrain import get_retrain_log as _get_log
    return {"log": _get_log()}


@app.get("/mlflow/runs")
def get_mlflow_runs(experiment: str = "stock-predictor", limit: int = 10):
    """
    Last N experiment runs from MLflow.

    Query params:
        experiment: 'stock-predictor', 'anomaly-detector', or 'risk-scorer'
        limit: Max number of runs to return (default 10)
    """
    from mlflow_setup import get_recent_runs

    runs = get_recent_runs(experiment, max_results=limit)
    return {"experiment": experiment, "runs": runs, "count": len(runs)}


@app.get("/mlflow/best-model")
def get_best_model(experiment: str = "stock-predictor", metric: str = "f1_score"):
    """
    Best performing model run by a specific metric.

    Query params:
        experiment: Experiment name
        metric: Metric to rank by (default 'f1_score')
    """
    from mlflow_setup import get_best_run

    best = get_best_run(experiment, metric=metric)
    if not best:
        return {"message": f"No runs found for experiment '{experiment}'"}
    return {"experiment": experiment, "metric": metric, "best_run": best}
