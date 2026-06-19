import { api } from "./api";
import type {
  DashboardSummary,
  UptimeMetrics,
  ResponseTimeMetrics,
  RecentIncidentsResponse,
} from "@/types/dashboard";

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<DashboardSummary, void>({
      query: () => "/v1/dashboard/summary",
      providesTags: ["Dashboard", "Monitor", "Incident"],
    }),
    getUptime: builder.query<UptimeMetrics, void>({
      query: () => "/v1/dashboard/uptime",
      providesTags: ["Dashboard", "HealthCheck"],
    }),
    getResponseTimes: builder.query<ResponseTimeMetrics, void>({
      query: () => "/v1/dashboard/response-times",
      providesTags: ["Dashboard", "HealthCheck"],
    }),
    getRecentIncidents: builder.query<RecentIncidentsResponse, void>({
      query: () => "/v1/dashboard/recent-incidents",
      providesTags: ["Dashboard", "Incident"],
    }),
  }),
});

export const {
  useGetSummaryQuery,
  useGetUptimeQuery,
  useGetResponseTimesQuery,
  useGetRecentIncidentsQuery,
} = dashboardApi;
