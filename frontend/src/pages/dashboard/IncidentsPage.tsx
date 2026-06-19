import { useNavigate } from "react-router-dom";
import { useGetIncidentsQuery } from "@/services/incidentsApi";
import { useGetMonitorsQuery } from "@/services/monitorsApi";
import { IncidentBadge } from "@/components/ui/IncidentBadge";
import type { Incident } from "@/types/incident";

/** Format an ISO 8601 UTC string into a human-readable local datetime. */
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Convert a duration in seconds to a compact human-readable string. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

export function IncidentsPage() {
  const navigate = useNavigate();

  const { data: incidents = [], isLoading: isIncidentsLoading, isError } = useGetIncidentsQuery(undefined, {
    pollingInterval: 10000, // Sync with backend scheduler tick (10 seconds)
  });
  const { data: monitors = [] } = useGetMonitorsQuery();

  // Build a quick lookup: monitor_id → monitor name
  const monitorNameMap = Object.fromEntries(monitors.map((m) => [m.id, m.name]));

  const openIncidents = incidents.filter((i) => i.status === "OPEN");
  const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED");

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 lg:p-6 border border-white/6"
        style={{
          background:
            "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(249,115,22,0.05) 50%, rgba(59,130,246,0.04) 100%)",
        }}
      >
        <div
          className="absolute -right-16 -top-16 w-48 h-48 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-white">Incidents</h1>
            </div>
            <p className="text-xs text-slate-500">Automatic outage detection across all monitored endpoints</p>
          </div>

          {/* Summary chips */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: openIncidents.length > 0
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(16,185,129,0.10)",
                border: openIncidents.length > 0
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid rgba(16,185,129,0.2)",
                color: openIncidents.length > 0 ? "#f87171" : "#34d399",
              }}
            >
              {openIncidents.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              )}
              {openIncidents.length} Open
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(148,163,184,0.06)",
                border: "1px solid rgba(148,163,184,0.12)",
                color: "#94a3b8",
              }}
            >
              {resolvedIncidents.length} Resolved
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {isIncidentsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="w-7 h-7 border-2 border-slate-600 border-t-red-500 rounded-full animate-spin mb-4" />
          <p className="text-sm">Loading incidents...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <svg className="w-10 h-10 mb-3 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">Failed to load incidents</p>
          <p className="text-xs text-slate-600 mt-1">Please try refreshing the page</p>
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState />
      ) : (
        <IncidentTable
          incidents={incidents}
          monitorNameMap={monitorNameMap}
          onRowClick={(id) => navigate(`/incidents/${id}`)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.06) 100%)",
          border: "1px solid rgba(16,185,129,0.15)",
        }}
      >
        <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-300">All systems operational</p>
      <p className="text-xs text-slate-600 mt-1.5 text-center max-w-xs">
        No incidents have been detected. Incidents are created automatically after 3 consecutive failed health checks.
      </p>
    </div>
  );
}

interface IncidentTableProps {
  incidents: Incident[];
  monitorNameMap: Record<number, string>;
  onRowClick: (id: number) => void;
}

function IncidentTable({ incidents, monitorNameMap, onRowClick }: IncidentTableProps) {
  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h2 className="text-sm font-semibold text-white">All Incidents</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {incidents.length} incident{incidents.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs text-slate-500">Live</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-xs font-semibold text-slate-500 bg-[#080d18]/20">
              <th className="py-3 px-5">Monitor</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Started</th>
              <th className="py-3 px-4">Resolved</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4 text-sm">
            {incidents.map((incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                monitorName={monitorNameMap[incident.monitor_id] ?? `Monitor #${incident.monitor_id}`}
                onClick={() => onRowClick(incident.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface IncidentRowProps {
  incident: Incident;
  monitorName: string;
  onClick: () => void;
}

function IncidentRow({ incident, monitorName, onClick }: IncidentRowProps) {
  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors duration-150 hover:bg-white/[0.03]"
    >
      {/* Monitor name */}
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: incident.status === "OPEN"
                ? "rgba(239,68,68,0.1)"
                : "rgba(16,185,129,0.08)",
              border: incident.status === "OPEN"
                ? "1px solid rgba(239,68,68,0.2)"
                : "1px solid rgba(16,185,129,0.15)",
            }}
          >
            <svg
              className="w-3.5 h-3.5"
              style={{ color: incident.status === "OPEN" ? "#f87171" : "#34d399" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-slate-200 font-medium text-sm truncate max-w-[180px]">{monitorName}</span>
        </div>
      </td>

      {/* Status badge */}
      <td className="py-3.5 px-4">
        <IncidentBadge status={incident.status} />
      </td>

      {/* Started at */}
      <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
        {formatDateTime(incident.started_at)}
      </td>

      {/* Resolved at */}
      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
        {incident.resolved_at ? (
          <span className="text-slate-400">{formatDateTime(incident.resolved_at)}</span>
        ) : (
          <span className="text-slate-600 italic">Ongoing</span>
        )}
      </td>

      {/* Duration */}
      <td className="py-3.5 px-4">
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{
            background: "rgba(148,163,184,0.06)",
            border: "1px solid rgba(148,163,184,0.1)",
            color: "#94a3b8",
          }}
        >
          {formatDuration(incident.duration_seconds)}
        </span>
      </td>

      {/* View details arrow */}
      <td className="py-3.5 px-5 text-right">
        <span className="text-slate-600 group-hover:text-slate-300 transition-colors">
          <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </td>
    </tr>
  );
}
