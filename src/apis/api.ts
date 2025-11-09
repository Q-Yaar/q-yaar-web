import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { AUTH_MODULE, GAME_MODULE, SERVER_MODULE } from "../constants/modules";
import { AUTH_LOGIN_API, BASE_URL } from "../constants/api-endpoints";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      try {
        const token = (getState() as any).auth?.userToken;
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
      } catch (err) {
        console.error("Error preparing headers:", err);
        return headers;
      }
    },
  }),
  tagTypes: [AUTH_MODULE, GAME_MODULE],
  reducerPath: SERVER_MODULE,
  keepUnusedDataFor: 30,
  endpoints: (builder) => ({
    login: builder.mutation({
      query: ({ email, password }: { email: string; password: string }) => ({
        url: AUTH_LOGIN_API,
        method: "POST",
        body: { email, password },
      }),
      invalidatesTags: [AUTH_MODULE],
    }),
  }),
});

export const { useLoginMutation } = api;
