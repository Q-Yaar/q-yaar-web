import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  AUTH_MODULE,
  DECK_MODULE,
  FACTS_MODULE,
  GAME_MODULE,
  SERVER_MODULE,
} from '../constants/modules';
import {
  AUTH_LOGIN_API,
  BASE_URL,
  AUTH_SIGNUP_API,
  FACTS_API,
} from '../constants/api-endpoints';
import { LoginRequest, LoginResponse, SignupRequest } from '../models/Login';
import {
  CreateFactRequest,
  Fact,
  GetFactsRequest,
  GetFactsResponse,
  UpdateFactRequest,
} from '../models/Fact';
import { RootState } from '../redux/store';

import { jwtDecode } from 'jwt-decode';
import { Mutex } from 'async-mutex';
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

const mutex = new Mutex();

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Wait until the mutex is available without locking it yet
  await mutex.waitForUnlock();

  const state = api.getState() as RootState;
  const authData = state.auth.authData;
  const playerProfile = authData?.profiles['PLAYER'];
  let token = playerProfile?.access_token;

  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        // Check if another request has already refreshed the token while we were waiting
        // We need to check the state again *inside* the lock if we acquire it.
        // But first, let's try to acquire the lock.
        if (!mutex.isLocked()) {
          const release = await mutex.acquire();
          try {
            // Re-read state to see if token was updated while we were acquiring lock
            const currentState = api.getState() as RootState;
            const currentAuthData = currentState.auth.authData;
            const currentProfile = currentAuthData?.profiles['PLAYER'];
            const currentToken = currentProfile?.access_token;

            if (currentToken) {
              const currentDecoded: any = jwtDecode(currentToken);
              // If still expired, we refresh
              if (currentDecoded.exp < currentTime) {
                const refreshToken = currentProfile?.refresh_token;
                const userId = currentAuthData?.user?.data?.user_id;

                if (refreshToken && userId) {
                  const refreshResult = await fetch(
                    `${BASE_URL}/${AUTH_REFRESH_API}`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        refresh_token: refreshToken,
                        user_id: userId,
                      }),
                    },
                  );

                  if (refreshResult.ok) {
                    const refreshData = await refreshResult.json();
                    api.dispatch(setToken({ authData: refreshData }));
                  } else {
                    api.dispatch(clearToken());
                    return { error: { status: 401, data: 'Refresh failed' } };
                  }
                } else {
                  api.dispatch(clearToken());
                  return { error: { status: 401, data: 'No refresh token' } };
                }
              }
            }
          } finally {
            release();
          }
        } else {
          // Mutex is locked, meaning a refresh is in progress.
          // We wait for it to unlock (which we did at the start), and then we continue.
          // After unlock, the token should be refreshed in the store.
          await mutex.waitForUnlock();
        }
      }
    } catch (error) {
      console.error('Token validation error', error);
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
  tagTypes: [AUTH_MODULE, GAME_MODULE, DECK_MODULE, 'QnA', FACTS_MODULE],
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
    getFacts: builder.query<GetFactsResponse, GetFactsRequest>({
      query: (params) => ({
        url: FACTS_API,
        method: 'GET',
        params,
      }),
      providesTags: [FACTS_MODULE],
    }),
    createFact: builder.mutation<Fact, CreateFactRequest>({
      query: (body) => ({
        url: FACTS_API,
        method: 'POST',
        body,
      }),
      invalidatesTags: [FACTS_MODULE],
    }),
    updateFact: builder.mutation<Fact, UpdateFactRequest>({
      query: ({ fact_id, ...body }) => ({
        url: `${FACTS_API}${fact_id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [FACTS_MODULE],
    }),
    deleteFact: builder.mutation<void, string>({
      query: (fact_id) => ({
        url: `${FACTS_API}${fact_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [FACTS_MODULE],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useGetFactsQuery,
  useCreateFactMutation,
  useUpdateFactMutation,
  useDeleteFactMutation,
} = api;
