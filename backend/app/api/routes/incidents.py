"""
Incident Routes.

Thin HTTP layer that:
  1. Resolves the authenticated user via the `get_current_user` dependency.
  2. Delegates all business logic (including ownership validation) to
     `incident_service`.
  3. Returns serialised IncidentResponse objects.

Routes contain no business logic — they are pure HTTP glue.
All ownership enforcement happens inside the service layer.

Endpoints:
    GET /incidents              - List all incidents for the current user.
    GET /incidents/{id}         - Get a specific incident by ID.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.user import User
from app.schemas.incident import IncidentResponse
from app.services.auth_service import get_current_user
from app.services import incident_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])


# ---------------------------------------------------------------------------
# GET /incidents
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[IncidentResponse],
    summary="List all incidents for the current user",
    description=(
        "Returns all incidents across all monitors owned by the authenticated user, "
        "ordered by start time descending (newest first). "
        "Incidents belonging to monitors owned by other users are never included."
    ),
)
def list_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[IncidentResponse]:
    """
    Retrieve all incidents for the authenticated user.

    On success: returns a list of incidents (may be empty).
    On missing/invalid auth token: returns HTTP 401.
    """
    incidents = incident_service.get_user_incidents(
        db=db,
        user_id=current_user.id,
    )
    return [IncidentResponse.model_validate(i) for i in incidents]


# ---------------------------------------------------------------------------
# GET /incidents/{incident_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Get a single incident by ID",
    description=(
        "Returns the incident with the given ID, only if its parent monitor is "
        "owned by the authenticated user. "
        "Returns HTTP 404 if the incident does not exist or belongs to another user's monitor."
    ),
)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncidentResponse:
    """
    Retrieve a single incident by ID.

    On success: returns the incident.
    On not found or wrong owner: returns HTTP 404.
    On missing/invalid auth token: returns HTTP 401.
    """
    incident = incident_service.get_incident_by_id(
        db=db,
        incident_id=incident_id,
        user_id=current_user.id,
    )
    return IncidentResponse.model_validate(incident)
