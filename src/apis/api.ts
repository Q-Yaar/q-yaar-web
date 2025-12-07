import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { AUTH_MODULE, GAME_MODULE, SERVER_MODULE } from "../constants/modules";
import { AUTH_LOGIN_API, BASE_URL, AUTH_SIGNUP_API } from "../constants/api-endpoints";
import { LoginRequest, LoginResponse, SignupRequest } from "../models/Login";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      try {
        // You might need to adjust this depending on which token (user vs profile) you want to use by default
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
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: AUTH_LOGIN_API,
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: [AUTH_MODULE],
    }),
    signup: builder.mutation<LoginResponse, SignupRequest>({
      query: (payload) => ({
        url: AUTH_SIGNUP_API, // Or use AUTH_SIGNUP_API constant
        method: "POST",
        body: payload,
      }),
      // Since signup logs you in (returns token), it invalidates auth tags
      invalidatesTags: [AUTH_MODULE],
    }),
  }),
});

export const { useLoginMutation, useSignupMutation } = api;