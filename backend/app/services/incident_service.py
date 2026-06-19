"""
Incident Service.

Implements all business logic for incident lifecycle management:

  - evaluate_incidents(db, monitor_id):
      Called after every health check result is persisted. Inspects the N
      most recent health check outcomes and decides whether to create a new
      OPEN incident or resolve an existing one.

  - get_user_incidents(db, user_id):
      Returns all incidents across all monitors owned by the given user,
      ordered from newest to oldest.

  - get_monitor_incidents(db, monitor_id, user_id):
      Returns all incidents for a specific monitor, enforcing ownership.

  - get_incident_by_id(db, incident_id, user_id):
      Returns a single incident by ID, enforcing ownership via its parent monitor.

Incident creation rules:
  - An incident is created only when the last CONSECUTIVE_FAILURE_THRESHOLD
    health checks are all FAILURE.
  - Only one OPEN incident may exist per monitor at any time. If one already
    exists, additional failures are silently ignored until it is resolved.
  - `started_at` is set to the `checked_at` timestamp of the threshold-
    breaching (i.e. the most-recent, Nth) failure.
  - `reason` is always the static string defined in INCIDENT_CREATION_REASON.

Incident resolution rules:
  - An OPEN incident is resolved when the last CONSECUTIVE_SUCCESS_THRESHOLD
    health checks are all SUCCESS.
  - `resolved_at` is set to the `checked_at` timestamp of the Nth success.

Separation of concerns:
  - This module contains ZERO HTTP logic. No FastAPI, no HTTPException (except
    for the ownership-enforcement helpers that are called from route handlers).
  - The caller (health_check_service) is responsible for passing an active,
    already-committed session so the newly-written HealthCheck row is visible.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.health_check import CheckStatus, HealthCheck
from app.models.incident import Incident, IncidentStatus
from app.models.monitor import Monitor

# ---------------------------------------------------------------------------
# Global thresholds (configurable here as module-level constants)
# ---------------------------------------------------------------------------

# Number of consecutive FAILURE results required to open an incident.
CONSECUTIVE_FAILURE_THRESHOLD: int = 3

# Number of consecutive SUCCESS results required to resolve an open incident.
CONSECUTIVE_SUCCESS_THRESHOLD: int = 3

# Human-readable reason stored on every created incident.
INCIDENT_CREATION_REASON: str = "3 consecutive failed health checks"


# ---------------------------------------------------------------------------
# Core evaluation logic
# ---------------------------------------------------------------------------

def evaluate_incidents(db: Session, monitor_id: int) -> None:
    """
    Evaluate incident creation / resolution rules for the given monitor.

    This function must be called after a HealthCheck row has been committed
    so that the new result is visible in the query below.

    Steps:
      1. Fetch the last max(FAILURE_THRESHOLD, SUCCESS_THRESHOLD) health checks.
      2. Check whether the most recent FAILURE_THRESHOLD are all FAILURE →
         create an OPEN incident if none exists.
      3. Check whether the most recent SUCCESS_THRESHOLD are all SUCCESS →
         resolve any existing OPEN incident.

    Args:
        db:         An active SQLAlchemy session. The session is NOT closed here;
                    the caller owns the session lifecycle.
        monitor_id: Primary key of the monitor whose results should be evaluated.

    Returns:
        None. Side-effects are written to the database within the caller's session.
    """
    window = max(CONSECUTIVE_FAILURE_THRESHOLD, CONSECUTIVE_SUCCESS_THRESHOLD)

    # Fetch the most recent `window` health checks in descending order.
    recent_checks: list[HealthCheck] = (
        db.query(HealthCheck)
        .filter(HealthCheck.monitor_id == monitor_id)
        .order_by(HealthCheck.checked_at.desc())
        .limit(window)
        .all()
    )

    # If we don't have enough data yet, skip evaluation.
    if len(recent_checks) < window:
        logger.debug(
            "Not enough health checks yet for incident evaluation",
            monitor_id=monitor_id,
            available=len(recent_checks),
            required=window,
        )
        return

    # Ordered oldest → newest for intuitive slicing
    # recent_checks[0] is the newest (desc order), so we reverse.
    # We work directly on the desc-ordered list:
    #   index 0 → newest check  (the one that just happened)
    #   index 1 → second newest
    #   etc.

    # ------------------------------------------------------------------
    # Rule 1: Create an incident on N consecutive failures
    # ------------------------------------------------------------------
    last_n_failures = recent_checks[:CONSECUTIVE_FAILURE_THRESHOLD]
    if all(c.status == CheckStatus.FAILURE for c in last_n_failures):
        _maybe_create_incident(db, monitor_id, triggering_check=last_n_failures[0])

    # ------------------------------------------------------------------
    # Rule 2: Resolve an open incident on N consecutive successes
    # ------------------------------------------------------------------
    last_n_successes = recent_checks[:CONSECUTIVE_SUCCESS_THRESHOLD]
    if all(c.status == CheckStatus.SUCCESS for c in last_n_successes):
        _maybe_resolve_incident(db, monitor_id, resolving_check=last_n_successes[0])


def _maybe_create_incident(
    db: Session,
    monitor_id: int,
    triggering_check: HealthCheck,
) -> None:
    """
    Create a new OPEN incident for the monitor, if one does not already exist.

    If an OPEN incident is already present, this is a no-op (the constraint
    that only one OPEN incident may exist per monitor is enforced here).

    Args:
        db:               Active session.
        monitor_id:       Monitor PK.
        triggering_check: The Nth failure HealthCheck — its `checked_at`
                          becomes `started_at` on the new incident.
    """
    existing_open: Optional[Incident] = (
        db.query(Incident)
        .filter(
            Incident.monitor_id == monitor_id,
            Incident.status == IncidentStatus.OPEN,
        )
        .first()
    )

    if existing_open:
        # Guard: one OPEN incident per monitor — do nothing.
        logger.debug(
            "OPEN incident already exists; skipping creation",
            monitor_id=monitor_id,
            incident_id=existing_open.id,
        )
        return

    incident = Incident(
        monitor_id=monitor_id,
        status=IncidentStatus.OPEN,
        reason=INCIDENT_CREATION_REASON,
        # started_at is the checked_at of the threshold-breaching failure.
        started_at=triggering_check.checked_at,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    logger.warning(
        "Incident OPENED",
        incident_id=incident.id,
        monitor_id=monitor_id,
        started_at=str(incident.started_at),
        reason=incident.reason,
    )


def _maybe_resolve_incident(
    db: Session,
    monitor_id: int,
    resolving_check: HealthCheck,
) -> None:
    """
    Resolve the open incident for the monitor, if one exists.

    Args:
        db:              Active session.
        monitor_id:      Monitor PK.
        resolving_check: The Nth success HealthCheck — its `checked_at`
                         becomes `resolved_at` on the incident.
    """
    open_incident: Optional[Incident] = (
        db.query(Incident)
        .filter(
            Incident.monitor_id == monitor_id,
            Incident.status == IncidentStatus.OPEN,
        )
        .first()
    )

    if not open_incident:
        # No open incident to resolve — this is normal (service was healthy).
        return

    open_incident.status = IncidentStatus.RESOLVED
    open_incident.resolved_at = resolving_check.checked_at
    db.commit()

    logger.info(
        "Incident RESOLVED",
        incident_id=open_incident.id,
        monitor_id=monitor_id,
        resolved_at=str(open_incident.resolved_at),
    )


# ---------------------------------------------------------------------------
# Query helpers (called from route handlers)
# ---------------------------------------------------------------------------

def get_user_incidents(
    db: Session,
    user_id: int,
) -> list[Incident]:
    """
    Return all incidents across all monitors owned by the given user.

    Incidents are ordered newest first (by `started_at` descending).

    Args:
        db:      Active session.
        user_id: Authenticated user's PK.

    Returns:
        A list of Incident ORM instances (may be empty).
    """
    return (
        db.query(Incident)
        .join(Monitor, Incident.monitor_id == Monitor.id)
        .filter(Monitor.user_id == user_id)
        .order_by(Incident.started_at.desc())
        .all()
    )


def get_monitor_incidents(
    db: Session,
    monitor_id: int,
    user_id: int,
) -> list[Incident]:
    """
    Return all incidents for a specific monitor, enforcing ownership.

    Args:
        db:         Active session.
        monitor_id: Monitor PK.
        user_id:    Authenticated user's PK (ownership check).

    Returns:
        A list of Incident ORM instances ordered by started_at descending.

    Raises:
        HTTPException 404: If the monitor does not exist or belongs to another user.
    """
    from fastapi import HTTPException, status

    # Ownership check first — return 404 (not 403) to avoid leaking existence.
    monitor: Optional[Monitor] = (
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
        db.query(Incident)
        .filter(Incident.monitor_id == monitor_id)
        .order_by(Incident.started_at.desc())
        .all()
    )


def get_incident_by_id(
    db: Session,
    incident_id: int,
    user_id: int,
) -> Incident:
    """
    Return a single incident by ID, enforcing ownership via its parent monitor.

    Args:
        db:          Active session.
        incident_id: Incident PK.
        user_id:     Authenticated user's PK.

    Returns:
        The Incident ORM instance.

    Raises:
        HTTPException 404: If the incident does not exist or its parent monitor
                           belongs to a different user.
    """
    from fastapi import HTTPException, status

    result: Optional[Incident] = (
        db.query(Incident)
        .join(Monitor, Incident.monitor_id == Monitor.id)
        .filter(Incident.id == incident_id, Monitor.user_id == user_id)
        .first()
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with id={incident_id} was not found.",
        )
    return result
