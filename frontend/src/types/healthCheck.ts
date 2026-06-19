/**
 * HealthCheck Types
 *
 * TypeScript interfaces that mirror the backend `HealthCheckResponse` Pydantic schema.
 * Every field that is nullable on the backend is represented as `| null` here so
 * that the UI can handle missing data gracefully (e.g. when a request timed out
 * and no HTTP status code was captured).
 */

export type CheckStatus = "SUCCESS" | "FAILURE";

export interface HealthCheck {
  id: number;
  monitor_id: number;
  /** Outcome of the check — SUCCESS if the actual status code matched expected, FAILURE otherwise. */
  status: CheckStatus;
  /** HTTP status code returned by the server. Null if no response was received. */
  status_code: number | null;
  /** Round-trip response time in milliseconds. Null if the request did not complete. */
  response_time_ms: number | null;
  /** Human-readable reason for failure when no HTTP response was received. Null on success. */
  error_message: string | null;
  /** ISO 8601 UTC string indicating when this check was executed. */
  checked_at: string;
}
