"""
Monitor Routes.

Thin HTTP layer that:
  1. Resolves the authenticated user via the `get_current_user` dependency.
  2. Accepts and validates incoming requests using Pydantic schemas.
  3. Delegates all business logic (including ownership validation) to `monitor_service`.
  4. Returns appropriate HTTP status codes and response bodies.

Routes intentionally contain no business logic — they are pure HTTP glue.
All ownership enforcement happens inside the service layer, never here.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.user import User
from app.schemas.monitor import MonitorCreate, MonitorResponse, MonitorUpdate
from app.services.auth_service import get_current_user
from app.services import monitor_service

router = APIRouter(prefix="/monitors", tags=["Monitors"])


# ---------------------------------------------------------------------------
# POST /monitors
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=MonitorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new monitor",
    description=(
        "Create a new monitor for the authenticated user. "
        "The monitor is immediately associated with the calling user's account. "
        "No actual monitoring begins until the scheduler is implemented in a future phase."
    ),
)
def create_monitor(
    payload: MonitorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MonitorResponse:
    """
    Create a new monitor owned by the current user.

    On success: returns the created monitor with HTTP 201.
    On validation failure: returns HTTP 422 (handled automatically by FastAPI).
    On missing/invalid auth token: returns HTTP 401 (from `get_current_user` dependency).
    """
    monitor = monitor_service.create_monitor(
        db=db,
        user_id=current_user.id,
        payload=payload,
    )
    return MonitorResponse.model_validate(monitor)


# ---------------------------------------------------------------------------
# GET /monitors
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[MonitorResponse],
    summary="List all monitors for the current user",
    description=(
        "Returns all monitors belonging to the authenticated user, "
        "ordered by creation date (newest first). "
        "Monitors belonging to other users are never included in this response."
    ),
)
def list_monitors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MonitorResponse]:
    """
    Retrieve all monitors for the authenticated user.

    On success: returns a list of monitors (may be empty if none exist yet).
    On missing/invalid auth token: returns HTTP 401.
    """
    monitors = monitor_service.get_all_monitors(db=db, user_id=current_user.id)
    return [MonitorResponse.model_validate(m) for m in monitors]


# ---------------------------------------------------------------------------
# GET /monitors/{monitor_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{monitor_id}",
    response_model=MonitorResponse,
    summary="Get a single monitor by ID",
    description=(
        "Returns the monitor with the given ID, only if it is owned by the "
        "authenticated user. Returns HTTP 404 if the monitor does not exist or "
        "belongs to another user (to avoid leaking resource existence)."
    ),
)
def get_monitor(
    monitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MonitorResponse:
    """
    Retrieve a single monitor by ID.

    On success: returns the monitor.
    On not found or wrong owner: returns HTTP 404.
    On missing/invalid auth token: returns HTTP 401.
    """
    monitor = monitor_service.get_monitor(
        db=db,
        monitor_id=monitor_id,
        user_id=current_user.id,
    )
    return MonitorResponse.model_validate(monitor)


# ---------------------------------------------------------------------------
# PUT /monitors/{monitor_id}
# ---------------------------------------------------------------------------

@router.put(
    "/{monitor_id}",
    response_model=MonitorResponse,
    summary="Update a monitor",
    description=(
        "Update one or more fields of an existing monitor. "
        "Only the fields included in the request body are updated — "
        "omitted fields retain their current values. "
        "Only the owning user may update the monitor."
    ),
)
def update_monitor(
    monitor_id: int,
    payload: MonitorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MonitorResponse:
    """
    Update an existing monitor.

    On success: returns the updated monitor.
    On not found or wrong owner: returns HTTP 404.
    On validation failure: returns HTTP 422.
    On missing/invalid auth token: returns HTTP 401.
    """
    monitor = monitor_service.update_monitor(
        db=db,
        monitor_id=monitor_id,
        user_id=current_user.id,
        payload=payload,
    )
    return MonitorResponse.model_validate(monitor)


# ---------------------------------------------------------------------------
# DELETE /monitors/{monitor_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{monitor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a monitor",
    description=(
        "Permanently delete a monitor. "
        "Only the owning user may delete the monitor. "
        "This action is irreversible."
    ),
)
def delete_monitor(
    monitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a monitor permanently.

    On success: returns HTTP 204 No Content (no response body).
    On not found or wrong owner: returns HTTP 404.
    On missing/invalid auth token: returns HTTP 401.
    """
    monitor_service.delete_monitor(
        db=db,
        monitor_id=monitor_id,
        user_id=current_user.id,
    )
