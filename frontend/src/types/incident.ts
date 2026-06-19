/**
 * Incident Types
 *
 * TypeScript interfaces that mirror the backend `IncidentResponse` Pydantic schema.
 * All nullable fields (resolved_at) are represented as `| null` so the UI
 * can safely handle ongoing (OPEN) incidents with no resolution time yet.
 */

export type IncidentStatus = "OPEN" | "RESOLVED";

export interface Incident {
  id: number;
  monitor_id: number;
  /** Current lifecycle state — OPEN while the outage is ongoing, RESOLVED once recovered. */
  status: IncidentStatus;
  /** Human-readable reason the incident was opened. */
  reason: string;
  /** ISO 8601 UTC string: timestamp of the 3rd consecutive failure that breached the threshold. */
  started_at: string;
  /** ISO 8601 UTC string: timestamp of the 3rd consecutive success that resolved the incident. Null while OPEN. */
  resolved_at: string | null;
  /** Duration of the incident in whole seconds. Computed server-side; live for OPEN incidents. */
  duration_seconds: number;
  /** ISO 8601 UTC string: when the incident row was first inserted. */
  created_at: string;
  /** ISO 8601 UTC string: when the incident row was last updated. */
  updated_at: string;
}
