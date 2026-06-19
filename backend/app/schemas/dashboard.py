from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class DashboardSummaryResponse(BaseModel):
    """
    Summary metrics for the dashboard.
    """
    total_monitors: int
    healthy_monitors: int
    down_monitors: int
    open_incidents: int
    resolved_incidents: int

    model_config = ConfigDict(from_attributes=True)


class MonitorUptime(BaseModel):
    """
    Uptime percentage for a single monitor.
    """
    monitor_id: int
    monitor_name: str
    uptime_24h: float
    uptime_7d: float


class UptimeMetricsResponse(BaseModel):
    """
    Overall and per-monitor uptime percentages.
    """
    overall_uptime_24h: float
    overall_uptime_7d: float
    monitors: List[MonitorUptime]

    model_config = ConfigDict(from_attributes=True)


class MonitorResponseTime(BaseModel):
    """
    Response time metrics for a single monitor.
    """
    monitor_id: int
    monitor_name: str
    average_response_time_ms: Optional[float]
    latest_response_time_ms: Optional[int]


class ResponseTimeMetricsResponse(BaseModel):
    """
    Response time metrics for all user monitors.
    """
    monitors: List[MonitorResponseTime]

    model_config = ConfigDict(from_attributes=True)


class RecentIncidentMonitor(BaseModel):
    """
    Basic monitor details for a recent incident.
    """
    id: int
    name: str
    url: str

    model_config = ConfigDict(from_attributes=True)


class RecentIncident(BaseModel):
    """
    A recent incident to display on the dashboard.
    """
    id: int
    status: str
    reason: str
    started_at: datetime
    resolved_at: Optional[datetime]
    monitor: RecentIncidentMonitor

    model_config = ConfigDict(from_attributes=True)


class RecentIncidentsResponse(BaseModel):
    """
    List of recent incidents.
    """
    incidents: List[RecentIncident]

    model_config = ConfigDict(from_attributes=True)
