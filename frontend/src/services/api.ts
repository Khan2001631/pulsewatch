import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api", // Proxied by Vite to backend
    credentials: "include", // Essential for HttpOnly cookies
  }),
  tagTypes: ["User", "Monitor"],
  endpoints: () => ({}),
});