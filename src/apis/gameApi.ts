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
        url: `/games/${gameId}`, // Adjust path to match your backend (e.g. /games/{id})
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
  }),
});

export const {
  useFetchGamesQuery,
  useFetchGameDetailsQuery,
  useFetchMyTeamQuery,
  useFetchTeamsQuery,
} = gamesApi;
