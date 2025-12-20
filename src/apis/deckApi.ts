import { api } from "./api";
import { ListResponse } from "../models/ApiResponse";
import { Card, DeckStats } from "../models/Deck";
import { DECK_MODULE } from "../constants/modules";


export const deckApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getDeckStats: builder.query<DeckStats, string>({
            query: (teamId) => `/api/v1/cards/deck/${teamId}/stats`,
            providesTags: [DECK_MODULE],
        }),

        peekDeck: builder.query<Card[], { numberOfCards: number; teamId: string }>({
            query: ({ numberOfCards, teamId }) => ({
                url: `/api/v1/cards/deck/${teamId}/peek`,
                method: "POST",
                body: {
                    "num_cards": numberOfCards
                }
            }),
            providesTags: [DECK_MODULE],
        }),

        getHand: builder.query<Card[], string>({
            query: (teamId) => `/api/v1/cards/deck/${teamId}/pile/hand`,
            providesTags: [DECK_MODULE],
        }),

        getDiscardPile: builder.query<Card[], string>({
            query: (teamId) => `/api/v1/cards/deck/${teamId}/pile/discard`,
            providesTags: [DECK_MODULE],
        }),

        shuffleDeck: builder.mutation<void, string>({
            query: (teamId) => ({
                url: `/api/v1/cards/deck/${teamId}/shuffle`,
                method: "POST",
                body: {
                    "piles": [
                        "HAND",
                        "DISCARD",
                        "DECK"
                    ]
                }
            }),
            invalidatesTags: [DECK_MODULE],
        }),

        drawCard: builder.mutation<Card, { cardId: string; teamId: string }>({
            query: ({ cardId, teamId }) => ({
                url: `/api/v1/cards/deck/${teamId}/cards/${cardId}/draw`,
                method: "POST",
            }),
            invalidatesTags: [DECK_MODULE],
        }),

        discardCard: builder.mutation<void, { cardId: string; teamId: string }>({
            query: ({ cardId, teamId }) => ({
                url: `/api/v1/cards/deck/${teamId}/cards/${cardId}/discard`,
                method: "POST",
            }),
            invalidatesTags: [DECK_MODULE],
        }),

        returnCard: builder.mutation<void, { cardId: string; teamId: string }>({
            query: ({ cardId, teamId }) => ({
                url: `/api/v1/cards/deck/${teamId}/cards/${cardId}/return`,
                method: "POST",
            }),
            invalidatesTags: [DECK_MODULE],
        }),
    }),
});

export const {
    usePeekDeckQuery,
    useGetDeckStatsQuery,
    useGetHandQuery,
    useGetDiscardPileQuery,
    useDrawCardMutation,
    useDiscardCardMutation,
    useShuffleDeckMutation,
    useReturnCardMutation
} = deckApi;