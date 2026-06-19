"""
Health Check Routes.

Thin HTTP layer that:
  1. Resolves the authenticated user via the `get_current_user` dependency.
  2. Delegates ownership validation and data retrieval to `health_check_service`.
  3. Returns serialised HealthCheckResponse objects.

Routes contain no business logic — they are pure HTTP glue.
All ownership enforcement happens inside the service layer.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.user import User
from app.schemas.health_check import HealthCheckResponse
from app.services.auth_service import get_current_user
from app.services import health_check_service

router = APIRouter(tags=["Health Checks"])


# ---------------------------------------------------------------------------
# GET /monitors/{monitor_id}/health-checks
# ---------------------------------------------------------------------------

@router.get(
    "/monitors/{monitor_id}/health-checks",
    response_model=list[HealthCheckResponse],
    summary="List health checks for a monitor",
    description=(
        "Returns the 50 most recent health check results for the specified monitor, "
        "ordered by check time descending (newest first). "
        "Only the owning user may access this data. "
        "Returns HTTP 404 if the monitor does not exist or belongs to another user."
    ),
)
def list_health_checks(
    monitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HealthCheckResponse]:
    """
    Retrieve the 50 most recent health checks for the given monitor.

    On success: returns a list of health check records (may be empty if no checks
                have run yet).
    On not found or wrong owner: returns HTTP 404.
    On missing/invalid auth token: returns HTTP 401.
    """
    checks = health_check_service.get_health_checks_for_monitor(
        db=db,
        monitor_id=monitor_id,
        user_id=current_user.id,
        limit=50,
    )
    return [HealthCheckResponse.model_validate(c) for c in checks]


# ---------------------------------------------------------------------------
# GET /health-checks/{health_check_id}
# ---------------------------------------------------------------------------

@router.get(
    "/health-checks/{health_check_id}",
    response_model=HealthCheckResponse,
    summary="Get a single health check by ID",
    description=(
        "Returns the health check record with the given ID. "
        "Ownership is enforced through the parent monitor — only the owning user "
        "may access this record. "
        "Returns HTTP 404 if the record does not exist or its monitor belongs to another user."
    ),
)
def get_health_check(
    health_check_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HealthCheckResponse:
    """
    Retrieve a single health check by ID.

    On success: returns the health check record.
    On not found or wrong owner: returns HTTP 404.
    On missing/invalid auth token: returns HTTP 401.
    """
    check = health_check_service.get_health_check_by_id(
        db=db,
        health_check_id=health_check_id,
        user_id=current_user.id,
    )
    return HealthCheckResponse.model_validate(check)
