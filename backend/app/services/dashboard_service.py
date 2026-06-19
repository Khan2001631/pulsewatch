from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Dict, Any

from app.models.monitor import Monitor
from app.models.incident import Incident, IncidentStatus
from app.models.health_check import HealthCheck, CheckStatus


class DashboardService:
    @staticmethod
    def get_summary(db: Session, user_id: int) -> Dict[str, Any]:
        """
        Calculate summary metrics for the user's monitors.
        """
        # Total monitors
        total_monitors = db.query(Monitor).filter(Monitor.user_id == user_id).count()
        
        # Down monitors (any monitor with an OPEN incident)
        down_monitors = db.query(Monitor).join(Incident, Monitor.id == Incident.monitor_id).filter(
            Monitor.user_id == user_id,
            Incident.status == IncidentStatus.OPEN
        ).count()
        
        # Active monitors
        active_monitors = db.query(Monitor).filter(
            Monitor.user_id == user_id, 
            Monitor.is_active == True
        ).count()
        
        # Active down monitors (active monitors that have an OPEN incident)
        active_down_monitors = db.query(Monitor).join(Incident, Monitor.id == Incident.monitor_id).filter(
            Monitor.user_id == user_id,
            Monitor.is_active == True,
            Incident.status == IncidentStatus.OPEN
        ).count()
        
        # Healthy monitors (active monitors without an OPEN incident)
        healthy_monitors = active_monitors - active_down_monitors

        # Incident counts
        open_incidents = db.query(Incident).join(Monitor, Incident.monitor_id == Monitor.id).filter(
            Monitor.user_id == user_id,
            Incident.status == IncidentStatus.OPEN
        ).count()
        
        resolved_incidents = db.query(Incident).join(Monitor, Incident.monitor_id == Monitor.id).filter(
            Monitor.user_id == user_id,
            Incident.status == IncidentStatus.RESOLVED
        ).count()

        return {
            "total_monitors": total_monitors,
            "healthy_monitors": healthy_monitors,
            "down_monitors": down_monitors,
            "open_incidents": open_incidents,
            "resolved_incidents": resolved_incidents
        }

    @staticmethod
    def get_uptime(db: Session, user_id: int) -> Dict[str, Any]:
        """
        Calculate overall and per-monitor uptime percentages for 24h and 7d.
        """
        now = datetime.now(timezone.utc)
        since_24h = now - timedelta(days=1)
        since_7d = now - timedelta(days=7)

        # Get user's monitors
        monitors = db.query(Monitor).filter(Monitor.user_id == user_id).all()
        monitor_ids = [m.id for m in monitors]
        
        if not monitor_ids:
            return {
                "overall_uptime_24h": 0.0,
                "overall_uptime_7d": 0.0,
                "monitors": []
            }

        def get_uptime_stats(since: datetime):
            # Query the count of total checks and successful checks grouped by monitor_id
            stats = db.query(
                HealthCheck.monitor_id,
                func.count(HealthCheck.id).label("total_checks"),
                func.sum(case((HealthCheck.status == CheckStatus.SUCCESS, 1), else_=0)).label("success_checks")
            ).filter(
                HealthCheck.monitor_id.in_(monitor_ids),
                HealthCheck.checked_at >= since
            ).group_by(HealthCheck.monitor_id).all()
            
            return {row.monitor_id: row for row in stats}

        stats_24h = get_uptime_stats(since_24h)
        stats_7d = get_uptime_stats(since_7d)

        monitor_uptimes = []
        overall_total_24h = 0
        overall_success_24h = 0
        overall_total_7d = 0
        overall_success_7d = 0

        for monitor in monitors:
            m_stat_24h = stats_24h.get(monitor.id)
            m_stat_7d = stats_7d.get(monitor.id)
            
            # 24h calculation
            m_total_24h = m_stat_24h.total_checks if m_stat_24h else 0
            m_success_24h = m_stat_24h.success_checks if m_stat_24h else 0
            m_uptime_24h = (m_success_24h / m_total_24h * 100) if m_total_24h > 0 else 0.0
            
            overall_total_24h += m_total_24h
            overall_success_24h += m_success_24h

            # 7d calculation
            m_total_7d = m_stat_7d.total_checks if m_stat_7d else 0
            m_success_7d = m_stat_7d.success_checks if m_stat_7d else 0
            m_uptime_7d = (m_success_7d / m_total_7d * 100) if m_total_7d > 0 else 0.0
            
            overall_total_7d += m_total_7d
            overall_success_7d += m_success_7d

            monitor_uptimes.append({
                "monitor_id": monitor.id,
                "monitor_name": monitor.name,
                "uptime_24h": round(m_uptime_24h, 2),
                "uptime_7d": round(m_uptime_7d, 2)
            })
            
        overall_uptime_24h = (overall_success_24h / overall_total_24h * 100) if overall_total_24h > 0 else 0.0
        overall_uptime_7d = (overall_success_7d / overall_total_7d * 100) if overall_total_7d > 0 else 0.0

        return {
            "overall_uptime_24h": round(overall_uptime_24h, 2),
            "overall_uptime_7d": round(overall_uptime_7d, 2),
            "monitors": monitor_uptimes
        }

    @staticmethod
    def get_response_times(db: Session, user_id: int) -> Dict[str, Any]:
        """
        Calculate average and get latest response time per monitor for the last 24h.
        """
        now = datetime.now(timezone.utc)
        since_24h = now - timedelta(days=1)

        monitors = db.query(Monitor).filter(Monitor.user_id == user_id).all()
        monitor_ids = [m.id for m in monitors]
        
        if not monitor_ids:
            return {"monitors": []}

        # Calculate average response time over the last 24h (only considering SUCCESS checks if we want, or all checks with a response time)
        # We will consider all checks that have a response_time_ms.
        avg_stats = db.query(
            HealthCheck.monitor_id,
            func.avg(HealthCheck.response_time_ms).label("avg_response_time")
        ).filter(
            HealthCheck.monitor_id.in_(monitor_ids),
            HealthCheck.checked_at >= since_24h,
            HealthCheck.response_time_ms.isnot(None)
        ).group_by(HealthCheck.monitor_id).all()

        avg_map = {row.monitor_id: row.avg_response_time for row in avg_stats}

        # Get latest response time
        # This can be done by getting the max(checked_at) per monitor, then joining back, or just querying one by one if number of monitors is small.
        # Since number of monitors per user is typically small, querying one by one for latest check is okay, or using window functions.
        # Let's use a simpler approach: one query to get latest check ID per monitor.
        subq = db.query(
            HealthCheck.monitor_id,
            func.max(HealthCheck.checked_at).label("latest_check")
        ).filter(
            HealthCheck.monitor_id.in_(monitor_ids),
            HealthCheck.response_time_ms.isnot(None)
        ).group_by(HealthCheck.monitor_id).subquery()

        latest_checks = db.query(HealthCheck).join(
            subq,
            (HealthCheck.monitor_id == subq.c.monitor_id) & (HealthCheck.checked_at == subq.c.latest_check)
        ).all()

        latest_map = {check.monitor_id: check.response_time_ms for check in latest_checks}

        monitor_response_times = []
        for monitor in monitors:
            avg_rt = avg_map.get(monitor.id)
            latest_rt = latest_map.get(monitor.id)
            
            monitor_response_times.append({
                "monitor_id": monitor.id,
                "monitor_name": monitor.name,
                "average_response_time_ms": round(float(avg_rt), 2) if avg_rt is not None else None,
                "latest_response_time_ms": latest_rt
            })

        return {
            "monitors": monitor_response_times
        }

    @staticmethod
    def get_recent_incidents(db: Session, user_id: int, limit: int = 10) -> Dict[str, Any]:
        """
        Get the most recent incidents across all of a user's monitors.
        """
        incidents = db.query(Incident).join(Monitor, Incident.monitor_id == Monitor.id).filter(
            Monitor.user_id == user_id
        ).order_by(Incident.started_at.desc()).limit(limit).all()

        return {
            "incidents": incidents
        }
