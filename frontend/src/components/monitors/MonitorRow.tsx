import { useState } from "react";
import { useGetMonitorHealthChecksQuery } from "@/services/healthChecksApi";
import { HealthCheckHistoryModal } from "./HealthCheckHistoryModal";
import type { Monitor } from "@/types/monitor";
import type { HealthCheck } from "@/types/healthCheck";

interface Props {
  monitor: Monitor;
  onEdit: (monitor: Monitor) => void;
  onDelete: (monitor: Monitor) => void;
  onToggleActive: (monitor: Monitor) => void;
  /** Layout mode — the monitor list view uses "table", dashboard uses "card-row" */
  variant?: "table" | "card-row";
}

/**
 * Returns a concise relative-time string, e.g. "Just now", "30s ago", "5m ago".
 */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return diffHr < 24 ? `${diffHr}h ago` : "Over a day ago";
}

/**
 * A skeleton shimmer cell rendered while health check data is first loading.
 */
function SkeletonPill() {
  return (
    <span className="inline-block w-16 h-5 rounded-full bg-white/5 animate-pulse" />
  );
}

/**
 * MonitorRow — renders a single monitor in either table or card-row variant.
 *
 * Health check data is fetched independently per-row with a 10-second polling
 * interval. This lets health status populate dynamically after the monitors
 * list loads, keeping the initial page render instant.
 *
 * The row shows:
 *  - Current health status (Healthy / Failing / Pending skeleton)
 *  - Last check time (relative, e.g. "30s ago")
 *  - Last response time in ms
 *  - A "History" button that opens the HealthCheckHistoryModal
 */
export function MonitorRow({ monitor, onEdit, onDelete, onToggleActive, variant = "table" }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    data: healthChecks = [],
    isLoading: isHealthLoading,
  } = useGetMonitorHealthChecksQuery(monitor.id, {
    pollingInterval: 10_000, // Stay live with the backend scheduler tick
  });

  const latestCheck: HealthCheck | undefined = healthChecks[0];
  const isSuccess = latestCheck?.status === "SUCCESS";
  const hasFailed = latestCheck?.status === "FAILURE";

  // ─── Status pill ────────────────────────────────────────────────────────
  function HealthStatusPill() {
    if (isHealthLoading && !latestCheck) return <SkeletonPill />;
    if (!latestCheck) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-white/8 text-slate-500 bg-white/3">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          Pending
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
        style={
          isSuccess
            ? { background: "rgba(16,185,129,0.1)", color: "#34d399", borderColor: "rgba(16,185,129,0.25)" }
            : { background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" }
        }
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: isSuccess ? "#10b981" : "#ef4444",
            boxShadow: isSuccess ? "0 0 4px #10b981" : "0 0 4px #ef4444",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
        {isSuccess ? "Healthy" : "Failing"}
      </span>
    );
  }

  // ─── Response time ───────────────────────────────────────────────────────
  function ResponseTime() {
    if (isHealthLoading && !latestCheck) return <SkeletonPill />;
    if (!latestCheck || latestCheck.response_time_ms == null)
      return <span className="text-slate-600 text-xs">—</span>;
    return (
      <span className="font-mono text-xs text-slate-300">
        {latestCheck.response_time_ms}
        <span className="text-slate-600 ml-0.5">ms</span>
      </span>
    );
  }

  // ─── Last checked ────────────────────────────────────────────────────────
  function LastChecked() {
    if (isHealthLoading && !latestCheck) return <SkeletonPill />;
    if (!latestCheck)
      return <span className="text-slate-600 text-xs">Never</span>;
    return (
      <span className="text-xs text-slate-400">{relativeTime(latestCheck.checked_at)}</span>
    );
  }

  // ─── History button ──────────────────────────────────────────────────────
  const historyBtn = (
    <button
      onClick={(e) => { e.stopPropagation(); setHistoryOpen(true); }}
      className="p-1.5 rounded bg-white/5 hover:bg-blue-500/15 text-slate-500 hover:text-blue-400 transition-colors"
      title="View check history"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );

  // ─── Monitor active/paused badge (schedule status) ──────────────────────
  const scheduleBadge = (
    <button
      onClick={(e) => { e.stopPropagation(); onToggleActive(monitor); }}
      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
        monitor.is_active
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
          : "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
      }`}
      title={monitor.is_active ? "Click to pause monitoring" : "Click to resume monitoring"}
    >
      {monitor.is_active ? "Active" : "Paused"}
    </button>
  );

  // ─── Variants ────────────────────────────────────────────────────────────
  const modal = (
    <HealthCheckHistoryModal
      isOpen={historyOpen}
      onClose={() => setHistoryOpen(false)}
      monitor={monitor}
      healthChecks={healthChecks}
      isLoading={isHealthLoading && healthChecks.length === 0}
    />
  );

  if (variant === "card-row") {
    // Used by the Dashboard tab — compact horizontal card-row layout
    const isActiveDot = !hasFailed && monitor.is_active;
    return (
      <>
        <div
          className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors cursor-pointer"
          onClick={() => onEdit(monitor)}
        >
          {/* Status dot — reflects actual health, not schedule status */}
          <div className="flex-shrink-0">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: hasFailed ? "#ef4444" : isActiveDot ? "#10b981" : "#f59e0b",
                boxShadow: `0 0 6px ${hasFailed ? "#ef4444" : isActiveDot ? "#10b981" : "#f59e0b"}`,
                animation: monitor.is_active ? "pulse-glow 2s ease-in-out infinite" : "none",
              }}
            />
          </div>

          {/* Name & URL */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                {monitor.method}
              </span>
              <p className="text-sm font-medium text-slate-200 truncate">{monitor.name}</p>
            </div>
            <p className="text-xs text-slate-600 truncate mt-0.5">{monitor.url}</p>
          </div>

          {/* Last checked */}
          <div className="hidden lg:flex flex-col items-end gap-0.5 w-20 text-right">
            <LastChecked />
            <span className="text-[10px] text-slate-600">Last check</span>
          </div>

          {/* Response time */}
          <div className="hidden md:flex flex-col items-end gap-0.5 w-20 text-right">
            <ResponseTime />
            <span className="text-[10px] text-slate-600">Response</span>
          </div>

          {/* Health status */}
          <div className="hidden sm:block">
            <HealthStatusPill />
          </div>

          {/* History button */}
          <div onClick={(e) => e.stopPropagation()}>
            {historyBtn}
          </div>
        </div>
        {modal}
      </>
    );
  }

  // ─── Table variant (Endpoints/Monitors Configuration tab) ────────────────
  return (
    <>
      <tr className="hover:bg-white/2 transition-colors">
        {/* Name & URL */}
        <td className="py-3.5 px-5 max-w-xs sm:max-w-md">
          <div className="font-semibold text-slate-200 truncate">{monitor.name}</div>
          <div className="text-xs text-slate-600 truncate mt-0.5">{monitor.url}</div>
        </td>

        {/* Method */}
        <td className="py-3.5 px-4">
          <span className="inline-block text-xs font-bold font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400">
            {monitor.method}
          </span>
        </td>

        {/* Expected status */}
        <td className="py-3.5 px-4 text-center">
          <span className="font-mono text-emerald-400 font-semibold">{monitor.expected_status_code}</span>
        </td>

        {/* Check interval */}
        <td className="py-3.5 px-4 text-center font-mono text-sm">
          {monitor.check_interval_seconds}s
        </td>

        {/* Health status */}
        <td className="py-3.5 px-4 text-center">
          <HealthStatusPill />
        </td>

        {/* Last response time */}
        <td className="py-3.5 px-4 text-center">
          <ResponseTime />
        </td>

        {/* Last checked */}
        <td className="py-3.5 px-4 text-center">
          <LastChecked />
        </td>

        {/* Schedule status */}
        <td className="py-3.5 px-4 text-center">
          {scheduleBadge}
        </td>

        {/* Actions */}
        <td className="py-3.5 px-5 text-right">
          <div className="flex items-center justify-end gap-2">
            {historyBtn}
            <button
              onClick={() => onEdit(monitor)}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Edit Monitor"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(monitor)}
              className="p-1.5 rounded bg-red-500/5 hover:bg-red-500/15 text-red-500 hover:text-red-400 transition-colors"
              title="Delete Monitor"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {modal}
    </>
  );
}
