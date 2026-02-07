import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  AUTH_MODULE,
  DECK_MODULE,
  GAME_MODULE,
  SERVER_MODULE,
} from '../constants/modules';
import {
  AUTH_LOGIN_API,
  BASE_URL,
  AUTH_SIGNUP_API,
} from '../constants/api-endpoints';
import { LoginRequest, LoginResponse, SignupRequest } from '../models/Login';
import { RootState } from '../redux/store';

import { jwtDecode } from 'jwt-decode';
import { clearToken, setToken } from '../redux/auth-reducer';
import { AUTH_REFRESH_API } from '../constants/api-endpoints';
import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    try {
      // You might need to adjust this depending on which token (user vs profile) you want to use by default
      const playerAccessToken = (getState() as RootState).auth.authData
        ?.profiles['PLAYER']?.access_token;
      if (playerAccessToken) {
        headers.set('Authorization', `Bearer ${playerAccessToken}`);
      }
      return headers;
    } catch (err) {
      console.error('Error preparing headers:', err);
      return headers;
    }
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const state = api.getState() as RootState;
  const authData = state.auth.authData;
  const playerProfile = authData?.profiles['PLAYER'];
  const token = playerProfile?.access_token;

  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        const refreshToken = playerProfile?.refresh_token;
        const userId = authData?.user?.data?.user_id;

        if (refreshToken && userId) {
          // Attempt to refresh token
          const refreshResult = await fetch(`${BASE_URL}/${AUTH_REFRESH_API}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refresh_token: refreshToken,
              user_id: userId,
            }),
          });

          if (refreshResult.ok) {
            const refreshData = await refreshResult.json();
            api.dispatch(setToken({ authData: refreshData }));
            // Retry the original query
            return baseQuery(args, api, extraOptions);
          } else {
            // Refresh failed
            api.dispatch(clearToken());
            return { error: { status: 401, data: 'Refresh failed' } };
          }
        } else {
          // No refresh token available
          api.dispatch(clearToken());
          return { error: { status: 401, data: 'No refresh token' } };
        }
      }
    } catch (error) {
      // Token decode error or other issue
      console.error('Token validation error', error);
      // Should we clear token? Maybe. Or let the request fail naturally with 401.
    }
  }

  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    api.dispatch(clearToken());
  }
  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: [AUTH_MODULE, GAME_MODULE, DECK_MODULE, 'QnA'],
  reducerPath: SERVER_MODULE,
  keepUnusedDataFor: 30,
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: AUTH_LOGIN_API,
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: [AUTH_MODULE],
    }),
    signup: builder.mutation<LoginResponse, SignupRequest>({
      query: (payload) => ({
        url: AUTH_SIGNUP_API, // Or use AUTH_SIGNUP_API constant
        method: 'POST',
        body: payload,
      }),
      // Since signup logs you in (returns token), it invalidates auth tags
      invalidatesTags: [AUTH_MODULE],
    }),
  }),
});

export const { useLoginMutation, useSignupMutation } = api;
