"""
Monitor Service.

Contains all business logic for the monitor lifecycle:
  - create_monitor    → Persist a new monitor record owned by the current user.
  - get_all_monitors  → Retrieve all monitors belonging to the current user.
  - get_monitor       → Retrieve a single monitor, with ownership validation.
  - update_monitor    → Update monitor fields, with ownership validation.
  - delete_monitor    → Delete a monitor, with ownership validation.

Design principles:
  - Routes (HTTP layer) call these functions and handle response serialisation.
  - Services contain zero HTTP logic — they accept/return plain Python objects.
  - Ownership validation is always performed inside service functions, never in routes.
    This ensures ownership rules cannot be bypassed by adding new routes later.
  - All database writes are explicitly committed here so callers don't need to
    manage transaction lifecycle.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.monitor import Monitor
from app.schemas.monitor import MonitorCreate, MonitorUpdate


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def create_monitor(db: Session, user_id: int, payload: MonitorCreate) -> Monitor:
    """
    Create and persist a new monitor owned by `user_id`.

    Steps:
      1. Construct a Monitor ORM instance from the validated payload.
      2. Set the `user_id` to the authenticated user's ID.
      3. Add, commit, and refresh to get all DB-generated fields (id, timestamps).

    Args:
        db:       Active SQLAlchemy session.
        user_id:  ID of the authenticated user creating this monitor.
        payload:  Validated MonitorCreate data from the request body.

    Returns:
        The newly created Monitor ORM instance.
    """
    # Convert Pydantic's AnyHttpUrl to a plain string before persisting.
    monitor = Monitor(
        user_id=user_id,
        name=payload.name,
        url=str(payload.url),
        method=payload.method,
        expected_status_code=payload.expected_status_code,
        check_interval_seconds=payload.check_interval_seconds,
        is_active=payload.is_active,
    )
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return monitor


# ---------------------------------------------------------------------------
# Read (list)
# ---------------------------------------------------------------------------

def get_all_monitors(db: Session, user_id: int) -> list[Monitor]:
    """
    Retrieve all monitors belonging to `user_id`.

    Only the calling user's monitors are returned — cross-user access is
    prevented by filtering on `user_id` at the query level.

    Args:
        db:      Active SQLAlchemy session.
        user_id: ID of the authenticated user.

    Returns:
        A list of Monitor ORM instances. Empty list if the user has no monitors.
    """
    return (
        db.query(Monitor)
        .filter(Monitor.user_id == user_id)
        .order_by(Monitor.created_at.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# Read (single)
# ---------------------------------------------------------------------------

def get_monitor(db: Session, monitor_id: int, user_id: int) -> Monitor:
    """
    Retrieve a single monitor by ID, enforcing ownership.

    Ownership validation: the monitor's `user_id` must match the calling user's ID.
    If the monitor does not exist OR belongs to a different user, we return 404
    (rather than 403) to prevent leaking the existence of other users' resources.

    Args:
        db:         Active SQLAlchemy session.
        monitor_id: Primary key of the monitor to retrieve.
        user_id:    ID of the authenticated user (used for ownership check).

    Returns:
        The Monitor ORM instance.

    Raises:
        HTTPException 404: If the monitor does not exist or is owned by another user.
    """
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
    return monitor


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

def update_monitor(
    db: Session,
    monitor_id: int,
    user_id: int,
    payload: MonitorUpdate,
) -> Monitor:
    """
    Update an existing monitor's fields, enforcing ownership.

    Only fields explicitly set in the request payload are updated — fields
    left as `None` in MonitorUpdate are skipped. This enables true partial
    updates (i.e. PATCH-style semantics over a PUT endpoint).

    Steps:
      1. Load the monitor via `get_monitor` (which enforces ownership).
      2. Iterate over all non-None fields in the payload.
      3. Commit and refresh to get the DB-updated `updated_at` timestamp.

    Args:
        db:         Active SQLAlchemy session.
        monitor_id: Primary key of the monitor to update.
        user_id:    ID of the authenticated user (used for ownership check).
        payload:    Validated MonitorUpdate data. Only non-None fields are applied.

    Returns:
        The updated Monitor ORM instance.

    Raises:
        HTTPException 404: If the monitor does not exist or is owned by another user.
    """
    monitor = get_monitor(db=db, monitor_id=monitor_id, user_id=user_id)

    # `model_dump(exclude_unset=True)` returns only the fields the client
    # actually provided, skipping fields left at their schema defaults.
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        # Convert AnyHttpUrl to str before persisting, as the ORM column
        # expects a plain string, not a Pydantic URL object.
        if field == "url" and value is not None:
            value = str(value)
        setattr(monitor, field, value)

    db.commit()
    db.refresh(monitor)
    return monitor


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def delete_monitor(db: Session, monitor_id: int, user_id: int) -> None:
    """
    Delete a monitor, enforcing ownership.

    Steps:
      1. Load the monitor via `get_monitor` (which enforces ownership and raises 404).
      2. Delete the row and commit.

    Args:
        db:         Active SQLAlchemy session.
        monitor_id: Primary key of the monitor to delete.
        user_id:    ID of the authenticated user (used for ownership check).

    Returns:
        None

    Raises:
        HTTPException 404: If the monitor does not exist or is owned by another user.
    """
    monitor = get_monitor(db=db, monitor_id=monitor_id, user_id=user_id)
    db.delete(monitor)
    db.commit()
