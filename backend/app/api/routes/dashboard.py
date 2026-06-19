from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    UptimeMetricsResponse,
    ResponseTimeMetricsResponse,
    RecentIncidentsResponse
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get summary metrics for the user's dashboard.
    """
    return DashboardService.get_summary(db=db, user_id=current_user.id)


@router.get("/uptime", response_model=UptimeMetricsResponse)
def get_dashboard_uptime(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get uptime metrics (24h and 7d) for all monitors and overall.
    """
    return DashboardService.get_uptime(db=db, user_id=current_user.id)


@router.get("/response-times", response_model=ResponseTimeMetricsResponse)
def get_dashboard_response_times(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get average and latest response times per monitor for the last 24h.
    """
    return DashboardService.get_response_times(db=db, user_id=current_user.id)


@router.get("/recent-incidents", response_model=RecentIncidentsResponse)
def get_dashboard_recent_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the latest 10 incidents across all of the user's monitors.
    """
    return DashboardService.get_recent_incidents(db=db, user_id=current_user.id)
