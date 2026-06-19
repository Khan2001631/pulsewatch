export interface DashboardSummary {
  total_monitors: number;
  healthy_monitors: number;
  down_monitors: number;
  open_incidents: number;
  resolved_incidents: number;
}

export interface MonitorUptime {
  monitor_id: number;
  monitor_name: string;
  uptime_24h: number;
  uptime_7d: number;
}

export interface UptimeMetrics {
  overall_uptime_24h: number;
  overall_uptime_7d: number;
  monitors: MonitorUptime[];
}

export interface MonitorResponseTime {
  monitor_id: number;
  monitor_name: string;
  average_response_time_ms: number | null;
  latest_response_time_ms: number | null;
}

export interface ResponseTimeMetrics {
  monitors: MonitorResponseTime[];
}

export interface RecentIncidentMonitor {
  id: number;
  name: string;
  url: string;
}

export interface RecentIncident {
  id: number;
  status: "OPEN" | "RESOLVED";
  reason: string;
  started_at: string;
  resolved_at: string | null;
  monitor: RecentIncidentMonitor;
}

export interface RecentIncidentsResponse {
  incidents: RecentIncident[];
}
