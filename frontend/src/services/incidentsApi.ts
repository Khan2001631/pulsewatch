import { api } from "./api";
import type { Incident } from "@/types/incident";

/**
 * Incidents API
 *
 * RTK Query endpoints that wrap the backend incident API.
 * Injected into the shared `api` instance so they share the same
 * cache, credentials (HttpOnly cookies), and base URL proxy.
 *
 * Endpoints:
 *   - getIncidents:        All incidents across the user's monitors, newest first.
 *   - getIncident:         A single incident by ID (ownership enforced by backend).
 *   - getMonitorIncidents: All incidents for a specific monitor, newest first.
 */
export const incidentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getIncidents: builder.query<Incident[], void>({
      query: () => "/v1/incidents",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Incident" as const, id })),
              { type: "Incident", id: "LIST" },
            ]
          : [{ type: "Incident", id: "LIST" }],
    }),

    getIncident: builder.query<Incident, number>({
      query: (id) => `/v1/incidents/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Incident", id }],
    }),

    getMonitorIncidents: builder.query<Incident[], number>({
      query: (monitorId) => `/v1/monitors/${monitorId}/incidents`,
      providesTags: (_result, _error, monitorId) => [
        { type: "Incident", id: `MONITOR_${monitorId}` },
      ],
    }),
  }),
});

export const {
  useGetIncidentsQuery,
  useGetIncidentQuery,
  useGetMonitorIncidentsQuery,
} = incidentsApi;
