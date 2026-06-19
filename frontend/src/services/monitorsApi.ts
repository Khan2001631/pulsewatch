import { api } from "./api";
import type { Monitor, MonitorCreate, MonitorUpdate } from "@/types/monitor";

export const monitorsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMonitors: builder.query<Monitor[], void>({
      query: () => "/v1/monitors",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Monitor" as const, id })),
              { type: "Monitor", id: "LIST" },
            ]
          : [{ type: "Monitor", id: "LIST" }],
    }),
    getMonitor: builder.query<Monitor, number>({
      query: (id) => `/v1/monitors/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Monitor", id }],
    }),
    createMonitor: builder.mutation<Monitor, MonitorCreate>({
      query: (monitor) => ({
        url: "/v1/monitors",
        method: "POST",
        body: monitor,
      }),
      invalidatesTags: [{ type: "Monitor", id: "LIST" }],
    }),
    updateMonitor: builder.mutation<Monitor, { id: number; data: MonitorUpdate }>({
      query: ({ id, data }) => ({
        url: `/v1/monitors/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Monitor", id },
        { type: "Monitor", id: "LIST" },
      ],
    }),
    deleteMonitor: builder.mutation<void, number>({
      query: (id) => ({
        url: `/v1/monitors/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Monitor", id },
        { type: "Monitor", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetMonitorsQuery,
  useGetMonitorQuery,
  useCreateMonitorMutation,
  useUpdateMonitorMutation,
  useDeleteMonitorMutation,
} = monitorsApi;
