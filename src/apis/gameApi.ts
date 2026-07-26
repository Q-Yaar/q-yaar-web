import { GAME_MODULE } from '../constants/modules';
import type { ListResponse } from '../models/ApiResponse';
import { api } from './api';
import { Game } from '../models/Game';
import { GAMES_API } from '../constants/api-endpoints';
import { Team } from '../models/Team';

export const gamesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    fetchGames: builder.query<ListResponse<Game>, any>({
      query: () => ({
        url: GAMES_API,
        method: 'GET',
      }),
      providesTags: () => [GAME_MODULE],
    }),
    fetchGameDetails: builder.query<Game, string>({
      query: (gameId) => ({
        url: `${GAMES_API}${gameId}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [GAME_MODULE],
    }),
    fetchMyTeam: builder.query<Team, string>({
      query: (gameId) => ({
        url: `api/v1/games/${gameId}/team/me`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [GAME_MODULE],
    }),
    fetchTeams: builder.query<Team[], string>({
      query: (gameId) => ({
        url: `${GAMES_API}${gameId}/team/`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [GAME_MODULE],
    }),
    exploreGames: builder.query<ListResponse<Game> | Game[], { search?: string } | void>({
      query: (params) => ({
        url: `${GAMES_API}explore`,
        method: 'GET',
        params: params || {},
      }),
      providesTags: () => [GAME_MODULE],
    }),
    joinGame: builder.mutation<Game, string>({
      query: (gameId) => ({
        url: `${GAMES_API}${gameId}/join`,
        method: 'POST',
      }),
      invalidatesTags: [GAME_MODULE],
    }),
    joinTeam: builder.mutation<Game, { gameId: string; teamId: string }>({
      query: ({ gameId, teamId }) => ({
        url: `${GAMES_API}${gameId}/team/${teamId}/join`,
        method: 'POST',
      }),
      invalidatesTags: [GAME_MODULE],
    }),
    fetchGameByCode: builder.query<Game, string>({
      query: (gameCode) => ({
        url: `${GAMES_API}code/${gameCode}`,
        method: 'GET',
      }),
      providesTags: (result, error, code) => [GAME_MODULE],
    }),
  }),
});

export const {
  useFetchGamesQuery,
  useFetchGameDetailsQuery,
  useFetchMyTeamQuery,
  useFetchTeamsQuery,
  useExploreGamesQuery,
  useJoinGameMutation,
  useJoinTeamMutation,
  useFetchGameByCodeQuery,
  useLazyFetchGameByCodeQuery,
} = gamesApi;

