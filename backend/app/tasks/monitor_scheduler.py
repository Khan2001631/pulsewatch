"""
Monitor Scheduler.

Implements a lightweight background scheduler that runs inside FastAPI's
asyncio event loop. No external infrastructure (Celery, Redis, etc.) is
required — the scheduler is a plain `asyncio` task started during application
lifespan.

Algorithm:
  - Wake up every SCHEDULER_TICK_SECONDS seconds.
  - Query all active monitors from the database.
  - For each monitor, decide if a check is due based on whether
    `now - last_checked_at[monitor.id] >= monitor.check_interval_seconds`.
  - If due, spawn a fire-and-forget asyncio task for the check so that
    concurrent monitors do not block each other.
  - Track `last_checked_at` in an in-memory dict (reset on restart).

On restart behaviour:
  All monitors are treated as immediately due on first scheduler wake-up.
  This is intentional: it ensures no monitor goes un-checked simply because
  the server restarted mid-cycle.

Graceful shutdown:
  The `asyncio.CancelledError` raised when FastAPI cancels the lifespan task
  is caught and logged, so the shutdown log message is clear.
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional

from app.core.logging import logger
from app.db.session import SessionLocal
from app.models.monitor import Monitor
from app.services.health_check_service import execute_health_check

# How often the scheduler wakes up to decide which monitors are due.
# Lower values mean more responsive scheduling but slightly more DB load.
SCHEDULER_TICK_SECONDS = 10


async def run_scheduler() -> None:
    """
    Background scheduler loop.

    Runs indefinitely until the FastAPI lifespan context cancels this task on
    application shutdown. Each iteration:
      1. Loads all active monitors.
      2. Checks which are due based on their `check_interval_seconds`.
      3. Fires individual health check tasks concurrently.

    Returns:
        None. Runs forever until cancelled.
    """
    logger.info("Monitor scheduler started", tick_seconds=SCHEDULER_TICK_SECONDS)

    # Maps monitor_id → datetime of its most recent check (UTC).
    # On first tick, every monitor has no recorded check time and is treated as due.
    last_checked_at: dict[int, Optional[datetime]] = {}

    while True:
        try:
            await asyncio.sleep(SCHEDULER_TICK_SECONDS)

            now = datetime.now(tz=timezone.utc)

            # ------------------------------------------------------------------
            # Load active monitors
            # ------------------------------------------------------------------
            db = SessionLocal()
            try:
                active_monitors: list[Monitor] = (
                    db.query(Monitor)
                    .filter(Monitor.is_active == True)  # noqa: E712
                    .all()
                )
            finally:
                db.close()

            logger.debug(
                "Scheduler tick: evaluating monitors",
                active_count=len(active_monitors),
            )

            # ------------------------------------------------------------------
            # Determine which monitors are due and fire checks
            # ------------------------------------------------------------------
            for monitor in active_monitors:
                last_time = last_checked_at.get(monitor.id)

                if last_time is None:
                    # First tick — treat as immediately due.
                    is_due = True
                else:
                    elapsed_seconds = (now - last_time).total_seconds()
                    is_due = elapsed_seconds >= monitor.check_interval_seconds

                if is_due:
                    # Update tracking time before spawning the task so that
                    # even if the check takes longer than the tick interval, we
                    # do not double-fire within the same cycle.
                    last_checked_at[monitor.id] = now

                    logger.debug(
                        "Firing health check",
                        monitor_id=monitor.id,
                        monitor_name=monitor.name,
                    )

                    # Fire-and-forget: the task runs concurrently and does not
                    # block the scheduler loop from processing other monitors.
                    asyncio.create_task(
                        execute_health_check(monitor.id),
                        name=f"health_check_monitor_{monitor.id}",
                    )

        except asyncio.CancelledError:
            # FastAPI is shutting down — exit the loop cleanly.
            logger.info("Monitor scheduler stopped (application shutdown)")
            return

        except Exception:
            # Log unexpected errors but keep the scheduler alive.
            # A bug in one tick should not take down the entire monitoring loop.
            logger.exception("Unexpected error in scheduler tick; will retry next tick")
