import { useParams, useNavigate } from "react-router-dom";
import { useGetIncidentQuery } from "@/services/incidentsApi";
import { useGetMonitorQuery } from "@/services/monitorsApi";
import { IncidentBadge } from "@/components/ui/IncidentBadge";

/** Format an ISO 8601 UTC string into a readable local datetime. */
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Convert seconds to a human-readable breakdown. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins} min ${secs} sec` : `${mins} minutes`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs} hr ${remainMins} min` : `${hrs} hours`;
}

export function IncidentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const incidentId = Number(id);

  const {
    data: incident,
    isLoading: isIncidentLoading,
    isError: isIncidentError,
  } = useGetIncidentQuery(incidentId, { skip: isNaN(incidentId) });

  // Fetch the parent monitor for the name (only once incident is loaded)
  const { data: monitor } = useGetMonitorQuery(incident?.monitor_id ?? 0, {
    skip: !incident?.monitor_id,
  });

  const isOpen = incident?.status === "OPEN";
  const accentColor = isOpen ? "#f87171" : "#34d399";
  const accentBg = isOpen ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.08)";
  const accentBorder = isOpen ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)";

  return (
    <div className="min-h-screen bg-[#060b14] p-5 lg:p-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/", { state: { tab: "Incidents" } })}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors group"
      >
        <svg
          className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Incidents
      </button>

      {/* ── Loading ── */}
      {isIncidentLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="w-7 h-7 border-2 border-slate-600 border-t-red-500 rounded-full animate-spin mb-4" />
          <p className="text-sm">Loading incident details...</p>
        </div>
      )}

      {/* ── Error / Not Found ── */}
      {isIncidentError && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">Incident not found</p>
          <p className="text-xs text-slate-600 mt-1">This incident may not exist or may belong to another account.</p>
        </div>
      )}

      {/* ── Details ── */}
      {incident && (
        <div className="space-y-5 max-w-3xl">
          {/* Hero card */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 border"
            style={{
              background: `linear-gradient(135deg, ${accentBg} 0%, rgba(6,11,20,0.95) 100%)`,
              borderColor: accentBorder,
            }}
          >
            {/* Glow orb */}
            <div
              className="absolute -right-12 -top-12 w-40 h-40 pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${isOpen ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.12)"} 0%, transparent 70%)`,
              }}
            />

            <div className="relative z-10">
              {/* Monitor name + badge row */}
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Monitor</p>
                  <h1 className="text-xl font-bold text-white">
                    {monitor?.name ?? `Monitor #${incident.monitor_id}`}
                  </h1>
                  {monitor?.url && (
                    <p className="text-xs text-slate-500 mt-1 font-mono truncate max-w-xs">{monitor.url}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <IncidentBadge status={incident.status} size="lg" />
                </div>
              </div>

              {/* Reason */}
              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Reason</p>
                  <p className="text-sm text-slate-200">{incident.reason}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailCard
              label="Started At"
              value={formatDateTime(incident.started_at)}
              subtext="Timestamp of the 3rd consecutive failure"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              iconColor="#f87171"
              iconBg="rgba(239,68,68,0.1)"
              iconBorder="rgba(239,68,68,0.2)"
            />

            <DetailCard
              label={incident.resolved_at ? "Resolved At" : "Status"}
              value={incident.resolved_at ? formatDateTime(incident.resolved_at) : "Ongoing"}
              subtext={
                incident.resolved_at
                  ? "Timestamp of the 3rd consecutive success"
                  : "Waiting for 3 consecutive successes"
              }
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              iconColor="#34d399"
              iconBg="rgba(16,185,129,0.1)"
              iconBorder="rgba(16,185,129,0.2)"
            />

            <DetailCard
              label="Duration"
              value={formatDuration(incident.duration_seconds)}
              subtext={incident.status === "OPEN" ? "Live — still ongoing" : "Total outage window"}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              iconColor="#a78bfa"
              iconBg="rgba(139,92,246,0.1)"
              iconBorder="rgba(139,92,246,0.2)"
            />

            <DetailCard
              label="Incident ID"
              value={`#${incident.id}`}
              subtext={`Recorded at ${formatDateTime(incident.created_at)}`}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              }
              iconColor="#60a5fa"
              iconBg="rgba(59,130,246,0.1)"
              iconBorder="rgba(59,130,246,0.2)"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DetailCard — reusable info tile
// ─────────────────────────────────────────────────────────────────

interface DetailCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
}

function DetailCard({ label, value, subtext, icon, iconColor, iconBg, iconBorder }: DetailCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3.5 border border-white/5"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: iconBg, border: `1px solid ${iconBorder}`, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-100 truncate">{value}</p>
        <p className="text-xs text-slate-600 mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}
