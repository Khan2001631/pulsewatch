"""
Health Check Service.

Contains the core logic for executing a single health check against a monitor
and persisting the result.

Responsibilities:
  - execute_health_check(monitor_id):
      Opens its own short-lived database session, fetches the monitor,
      performs the HTTP request via httpx with a 10-second timeout,
      compares the response code against the expected code, and writes
      a HealthCheck row to the database.

Design notes:
  - This service is called from the background scheduler (async context), not
    from HTTP request handlers, so it creates its own SessionLocal rather than
    receiving a session from a FastAPI dependency.
  - A 10-second timeout is applied to every HTTP request. Requests that
    exceed this limit are persisted as FAILURE with an appropriate error_message.
  - Any exception that prevents an HTTP response (DNS failure, connection
    refused, SSL error, etc.) is also caught and persisted as FAILURE.
  - The function is intentionally async so the scheduler can run multiple
    checks concurrently via asyncio.create_task without blocking.
"""

import time
from typing import Optional

import httpx

from app.core.logging import logger
from app.db.session import SessionLocal
from app.models.health_check import CheckStatus, HealthCheck
from app.models.monitor import Monitor
from app.services import incident_service

# Timeout in seconds applied to every outbound health-check HTTP request.
# Requests that exceed this limit are recorded as FAILURE.
HTTP_REQUEST_TIMEOUT_SECONDS = 10.0


async def execute_health_check(monitor_id: int) -> None:
    """
    Perform a single health check for the given monitor and persist the result.

    This function opens a dedicated database session for the duration of the
    check so that it is fully isolated from any concurrent request sessions.

    Steps:
      1. Load the Monitor record from the DB (skip gracefully if not found).
      2. Send the HTTP request using httpx with a 10-second timeout.
      3. Record the response time and compare the status code.
      4. Write a HealthCheck row reflecting SUCCESS or FAILURE.

    Args:
        monitor_id: Primary key of the Monitor to check.

    Returns:
        None. Results are persisted to the database; nothing is returned to
        the caller. Any unexpected exceptions are caught and logged so they
        do not crash the scheduler loop.
    """
    db = SessionLocal()
    try:
        # ------------------------------------------------------------------
        # 1. Load monitor
        # ------------------------------------------------------------------
        monitor: Optional[Monitor] = db.query(Monitor).filter(Monitor.id == monitor_id).first()
        if not monitor:
            # Monitor may have been deleted between scheduler tick and execution.
            logger.warning(
                "Health check skipped: monitor not found",
                monitor_id=monitor_id,
            )
            return

        logger.info(
            "Starting health check",
            monitor_id=monitor.id,
            monitor_name=monitor.name,
            url=monitor.url,
            method=monitor.method,
        )

        # ------------------------------------------------------------------
        # 2. Execute the HTTP request
        # ------------------------------------------------------------------
        status_code: Optional[int] = None
        response_time_ms: Optional[int] = None
        error_message: Optional[str] = None
        check_status: CheckStatus

        start_ns = time.monotonic_ns()

        try:
            async with httpx.AsyncClient(timeout=HTTP_REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.request(
                    method=monitor.method.value,
                    url=monitor.url,
                )

            # Calculate elapsed time before doing anything else.
            elapsed_ms = int((time.monotonic_ns() - start_ns) / 1_000_000)

            status_code = response.status_code
            response_time_ms = elapsed_ms

            # ------------------------------------------------------------------
            # 3. Compare against expected code
            # ------------------------------------------------------------------
            if status_code == monitor.expected_status_code:
                check_status = CheckStatus.SUCCESS
                logger.info(
                    "Health check SUCCESS",
                    monitor_id=monitor.id,
                    monitor_name=monitor.name,
                    status_code=status_code,
                    expected_status_code=monitor.expected_status_code,
                    response_time_ms=elapsed_ms,
                )
            else:
                check_status = CheckStatus.FAILURE
                logger.warning(
                    "Health check FAILURE: unexpected status code",
                    monitor_id=monitor.id,
                    monitor_name=monitor.name,
                    status_code=status_code,
                    expected_status_code=monitor.expected_status_code,
                    response_time_ms=elapsed_ms,
                )

        except httpx.TimeoutException as exc:
            elapsed_ms = int((time.monotonic_ns() - start_ns) / 1_000_000)
            response_time_ms = elapsed_ms
            check_status = CheckStatus.FAILURE
            error_message = f"Request timed out after {HTTP_REQUEST_TIMEOUT_SECONDS:.0f}s"
            logger.warning(
                "Health check FAILURE: timeout",
                monitor_id=monitor.id,
                monitor_name=monitor.name,
                url=monitor.url,
                timeout_seconds=HTTP_REQUEST_TIMEOUT_SECONDS,
                error=str(exc),
            )

        except httpx.RequestError as exc:
            # Covers DNS resolution failures, connection refused, SSL errors, etc.
            check_status = CheckStatus.FAILURE
            error_message = f"{type(exc).__name__}: {exc}"
            logger.warning(
                "Health check FAILURE: request error",
                monitor_id=monitor.id,
                monitor_name=monitor.name,
                url=monitor.url,
                error=str(exc),
            )

        # ------------------------------------------------------------------
        # 4. Persist the result
        # ------------------------------------------------------------------
        health_check = HealthCheck(
            monitor_id=monitor.id,
            status=check_status,
            status_code=status_code,
            response_time_ms=response_time_ms,
            error_message=error_message,
        )
        db.add(health_check)
        db.commit()

        logger.debug(
            "Health check result persisted",
            health_check_id=health_check.id,
            monitor_id=monitor.id,
        )

        # ------------------------------------------------------------------
        # 5. Evaluate incident rules
        # ------------------------------------------------------------------
        # Called after commit so the new HealthCheck row is visible to the
        # incident query. evaluate_incidents handles its own commit internally.
        incident_service.evaluate_incidents(db=db, monitor_id=monitor.id)

    except Exception:
        # Safety net: log unexpected errors without crashing the scheduler.
        logger.exception(
            "Unexpected error during health check execution",
            monitor_id=monitor_id,
        )
    finally:
        db.close()


def get_health_checks_for_monitor(
    db,
    monitor_id: int,
    user_id: int,
    limit: int = 50,
) -> list[HealthCheck]:
    """
    Retrieve the most recent health checks for a monitor, enforcing ownership.

    Validates that the monitor belongs to `user_id` before fetching records.
    Returns the latest `limit` results ordered by `checked_at` descending.

    Args:
        db:         Active SQLAlchemy session.
        monitor_id: Primary key of the monitor.
        user_id:    ID of the authenticated user (used for ownership check).
        limit:      Maximum number of records to return (default 50).

    Returns:
        A list of HealthCheck ORM instances, newest first.

    Raises:
        HTTPException 404: If the monitor does not exist or belongs to another user.
    """
    from fastapi import HTTPException, status
    from app.models.monitor import Monitor

    # Verify ownership: fail with 404 (not 403) to avoid leaking resource existence.
    monitor = (
        db.query(Monitor)
        .filter(Monitor.id == monitor_id, Monitor.user_id == user_id)
        .first()
    )
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitor with id={monitor_id} was not found.",
        )

    return (
        db.query(HealthCheck)
        .filter(HealthCheck.monitor_id == monitor_id)
        .order_by(HealthCheck.checked_at.desc())
        .limit(limit)
        .all()
    )


def get_health_check_by_id(
    db,
    health_check_id: int,
    user_id: int,
) -> HealthCheck:
    """
    Retrieve a single health check by ID, enforcing ownership via its parent monitor.

    Args:
        db:               Active SQLAlchemy session.
        health_check_id:  Primary key of the health check record.
        user_id:          ID of the authenticated user.

    Returns:
        The HealthCheck ORM instance.

    Raises:
        HTTPException 404: If the record does not exist or the parent monitor
                           belongs to a different user.
    """
    from fastapi import HTTPException, status
    from app.models.monitor import Monitor

    # Join through Monitor to enforce ownership in a single query.
    result = (
        db.query(HealthCheck)
        .join(Monitor, HealthCheck.monitor_id == Monitor.id)
        .filter(HealthCheck.id == health_check_id, Monitor.user_id == user_id)
        .first()
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Health check with id={health_check_id} was not found.",
        )
    return result
