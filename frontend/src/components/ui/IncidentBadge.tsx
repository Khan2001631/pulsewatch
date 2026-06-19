import type { IncidentStatus } from "@/types/incident";

interface IncidentBadgeProps {
  status: IncidentStatus;
  /** Optional size variant. Defaults to "md". */
  size?: "sm" | "md" | "lg";
}

/**
 * IncidentBadge
 *
 * Visual chip that clearly distinguishes OPEN from RESOLVED incidents.
 *
 * OPEN    — pulsing red/orange gradient with a live-activity dot animation.
 * RESOLVED — static emerald gradient indicating a healthy recovery.
 *
 * The pulse animation on the OPEN state is intentional: it draws the eye
 * immediately to active outages, matching the urgency of the situation.
 */
export function IncidentBadge({ status, size = "md" }: IncidentBadgeProps) {
  const isOpen = status === "OPEN";

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-2",
    lg: "px-3 py-1.5 text-sm gap-2",
  }[size];

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }[size];

  if (isOpen) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full ${sizeClasses}`}
        style={{
          background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(249,115,22,0.12) 100%)",
          border: "1px solid rgba(239,68,68,0.35)",
          color: "#f87171",
        }}
      >
        {/* Pulsing live-activity dot */}
        <span className="relative flex items-center justify-center flex-shrink-0">
          <span
            className={`absolute inline-flex rounded-full opacity-75 animate-ping ${dotSize}`}
            style={{ background: "rgba(239,68,68,0.6)" }}
          />
          <span
            className={`relative inline-flex rounded-full ${dotSize}`}
            style={{ background: "#ef4444" }}
          />
        </span>
        OPEN
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses}`}
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)",
        border: "1px solid rgba(16,185,129,0.25)",
        color: "#34d399",
      }}
    >
      {/* Static resolved dot */}
      <span
        className={`inline-flex rounded-full flex-shrink-0 ${dotSize}`}
        style={{ background: "#10b981" }}
      />
      RESOLVED
    </span>
  );
}
