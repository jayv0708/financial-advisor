"""
scheduler.py — APScheduler Background Retraining
==================================================
Sets up a BackgroundScheduler that retrains all models
every Sunday at 2:00 AM UTC automatically.

Integrated into the FastAPI application lifecycle.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = BackgroundScheduler()


def _retrain_job():
    """Wrapper that runs the full retrain pipeline on schedule."""
    try:
        from pipeline.retrain import retrain_all
        print("[scheduler] Starting scheduled retrain...")
        retrain_all(trigger="scheduled")
        print("[scheduler] Scheduled retrain complete.")
    except Exception as e:
        print(f"[scheduler] Retrain job failed: {e}")


def start_scheduler():
    """Start the background scheduler with the weekly retrain job."""
    scheduler.add_job(
        _retrain_job,
        trigger=CronTrigger(day_of_week="sun", hour=2, minute=0, timezone="UTC"),
        id="weekly_retrain",
        name="Weekly Model Retrain",
        replace_existing=True,
    )
    scheduler.start()
    print("[scheduler] Background scheduler started. Next retrain: Sunday 2:00 AM UTC.")


def stop_scheduler():
    """Shut down the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[scheduler] Scheduler stopped.")
