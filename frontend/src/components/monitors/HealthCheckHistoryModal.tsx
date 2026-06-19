import { createPortal } from "react-dom";
import type { HealthCheck } from "@/types/healthCheck";
import type { Monitor } from "@/types/monitor";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  monitor: Monitor;
  healthChecks: HealthCheck[];
  isLoading?: boolean;
}

/**
 * Format a UTC ISO string to a human-readable local date/time.
 * e.g. "Jun 19, 2026, 07:31:02 AM"
 */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Returns a concise relative-time label for display in the table.
 * e.g. "Just now", "30s ago", "5m ago", "2h ago"
 */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return formatTime(iso);
}

export function HealthCheckHistoryModal({
  isOpen,
  onClose,
  monitor,
  healthChecks,
  isLoading = false,
}: Props) {
  if (!isOpen) return null;

  // Render via a portal so the modal escapes any overflow-hidden / transform
  // ancestors (e.g. the scrollable table container) and always covers the
  // full viewport using the true stacking context of document.body.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d1527] shadow-2xl z-10 flex flex-col max-h-[85vh]"
        style={{ animation: "fadeIn 0.15s ease-out" }}
      >
        {/* Glow */}
        <div
          className="absolute -right-24 -top-24 w-56 h-56 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/6 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {/* Clock icon */}
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-base font-bold text-white">Check History</h3>
            </div>
            <p className="text-xs text-slate-500 font-mono truncate max-w-sm">
              {monitor.name} &nbsp;·&nbsp; {monitor.url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white transition-colors flex-shrink-0 ml-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-3" />
              <p className="text-xs">Loading history...</p>
            </div>
          ) : healthChecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <svg className="w-10 h-10 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-slate-400">No checks have run yet</p>
              <p className="text-xs text-slate-600 mt-1">
                The scheduler will pick this up within the next 10 seconds.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-white/5 text-xs font-semibold text-slate-500 bg-[#080d18]">
                  <th className="py-3 px-5">Time</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">HTTP Code</th>
                  <th className="py-3 px-4 text-center">Response Time</th>
                  <th className="py-3 px-5">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {healthChecks.map((check) => {
                  const isSuccess = check.status === "SUCCESS";
                  return (
                    <tr key={check.id} className="hover:bg-white/2 transition-colors text-sm">
                      {/* Time */}
                      <td className="py-3 px-5">
                        <div className="text-xs font-medium text-slate-300">{relativeTime(check.checked_at)}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{formatTime(check.checked_at)}</div>
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                          style={
                            isSuccess
                              ? { background: "rgba(16,185,129,0.1)", color: "#34d399", borderColor: "rgba(16,185,129,0.25)" }
                              : { background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" }
                          }
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: isSuccess ? "#10b981" : "#ef4444" }}
                          />
                          {isSuccess ? "Success" : "Failure"}
                        </span>
                      </td>

                      {/* HTTP code */}
                      <td className="py-3 px-4 text-center">
                        {check.status_code != null ? (
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: isSuccess ? "#34d399" : "#f87171" }}
                          >
                            {check.status_code}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>

                      {/* Response time */}
                      <td className="py-3 px-4 text-center">
                        {check.response_time_ms != null ? (
                          <span className="font-mono text-xs text-slate-300">
                            {check.response_time_ms}
                            <span className="text-slate-600 ml-0.5">ms</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>

                      {/* Error message */}
                      <td className="py-3 px-5 max-w-[200px]">
                        {check.error_message ? (
                          <span className="text-xs text-red-400/80 truncate block" title={check.error_message}>
                            {check.error_message}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-700">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {healthChecks.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 flex-shrink-0">
            <p className="text-xs text-slate-600">
              Showing latest {healthChecks.length} check{healthChecks.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs text-slate-600">Auto-refreshes every 10s</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body // ← Escape all parent containers, render at root level
  );
}
