import { api } from "./api";
import type { HealthCheck } from "@/types/healthCheck";

/**
 * Health Checks API
 *
 * RTK Query endpoints that wrap the backend health check API.
 * Injected into the shared `api` instance so they share the same
 * cache, credentials (HttpOnly cookies), and base URL proxy.
 *
 * Endpoints:
 *   - getMonitorHealthChecks: Fetches the latest 50 checks for a given
 *     monitor, ordered newest-first. Used with pollingInterval so the
 *     row-level status badges stay live without a full page refresh.
 */
export const healthChecksApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMonitorHealthChecks: builder.query<HealthCheck[], number>({
      query: (monitorId) => `/v1/monitors/${monitorId}/health-checks`,
      providesTags: (_result, _error, monitorId) => [
        { type: "HealthCheck", id: monitorId },
      ],
    }),
  }),
});

export const { useGetMonitorHealthChecksQuery } = healthChecksApi;
