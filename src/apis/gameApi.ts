import { GAME_MODULE } from "../constants/modules";
import type { ListResponse } from "../models/ApiResponse";
import { api } from "./api";
import { Game } from "../models/Game";
import { GAMES_API } from "../constants/api-endpoints";

export const gamesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    fetchGames: builder.query<ListResponse<Game>, any>({
      query: () => ({
        url: GAMES_API,
        method: "GET",
      }),
      providesTags: () => [GAME_MODULE],
    }),
  }),
});
