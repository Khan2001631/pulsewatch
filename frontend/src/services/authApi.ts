import { api } from "./api";
import type { User, LoginCredentials, RegisterCredentials } from "@/types/auth";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => "/v1/auth/me",
      providesTags: ["User"],
    }),
    login: builder.mutation<{ message: string }, LoginCredentials>({
      query: (credentials) => ({
        url: "/v1/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User"],
    }),
    register: builder.mutation<User, RegisterCredentials>({
      query: (credentials) => ({
        url: "/v1/auth/register",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/v1/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    refresh: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/v1/auth/refresh",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshMutation,
} = authApi;
