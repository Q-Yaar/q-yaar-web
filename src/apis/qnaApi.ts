import { api } from './api';
import { QNA_API } from '../constants/api-endpoints';
import { ListResponse } from '../models/ApiResponse';
import {
  Category,
  QuestionTemplate,
  AskedQuestion,
  AskQuestionRequest,
  AnswerQuestionRequest,
} from '../models/QnA';
import { QNA_MODULE } from '../constants/modules';

export const qnaApi = api.injectEndpoints({
  endpoints: (builder) => ({
    fetchCategories: builder.query<ListResponse<Category>, void>({
      query: () => ({
        url: `${QNA_API}categories/`,
        method: 'GET',
      }),
      providesTags: [QNA_MODULE],
    }),
    fetchQuestionTemplates: builder.query<
      ListResponse<QuestionTemplate>,
      { categoryId: string; gameId?: string }
    >({
      query: ({ categoryId, gameId }) => ({
        url: `${QNA_API}categories/${categoryId}/questions/`,
        method: 'GET',
        params: { game_id: gameId },
      }),
      providesTags: [QNA_MODULE],
    }),
    fetchAskedQuestions: builder.query<
      ListResponse<AskedQuestion>,
      { gameId: string; targetTeamId: string }
    >({
      query: ({ gameId, targetTeamId }) => ({
        url: `${QNA_API}game/${gameId}/asked-questions`,
        method: 'GET',
        params: { target_team_id: targetTeamId },
      }),
      providesTags: [QNA_MODULE],
    }),
    askQuestion: builder.mutation<
      AskedQuestion,
      { gameId: string; questionId: string; body: AskQuestionRequest }
    >({
      query: ({ gameId, questionId, body }) => ({
        url: `${QNA_API}game/${gameId}/questions/${questionId}/ask`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [QNA_MODULE],
    }),
    answerQuestion: builder.mutation<
      AskedQuestion,
      { gameId: string; askedQuestionId: string; body: AnswerQuestionRequest }
    >({
      query: ({ gameId, askedQuestionId, body }) => ({
        url: `${QNA_API}game/${gameId}/asked-questions/${askedQuestionId}/answer`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [QNA_MODULE],
    }),
    fetchQuestionTemplateDetails: builder.query<
      QuestionTemplate,
      { categoryId: string; questionId: string }
    >({
      query: ({ categoryId, questionId }) => ({
        url: `${QNA_API}categories/${categoryId}/questions/${questionId}`,
        method: 'GET',
      }),
      providesTags: [QNA_MODULE],
    }),
    updateAskedQuestion: builder.mutation<
      AskedQuestion,
      {
        gameId: string;
        askedQuestionId: string;
        body: {
          question_meta: { location_points: { lat: string; lon: string }[] };
        };
      }
    >({
      query: ({ gameId, askedQuestionId, body }) => ({
        url: `${QNA_API}game/${gameId}/asked-questions/${askedQuestionId}/update`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [QNA_MODULE],
    }),
    acceptAnswer: builder.mutation<
      AskedQuestion,
      { gameId: string; askedQuestionId: string }
    >({
      query: ({ gameId, askedQuestionId }) => ({
        url: `${QNA_API}game/${gameId}/asked-questions/${askedQuestionId}/accept`,
        method: 'PATCH',
      }),
      invalidatesTags: [QNA_MODULE],
    }),
  }),
});

export const {
  useFetchCategoriesQuery,
  useFetchQuestionTemplatesQuery,
  useFetchQuestionTemplateDetailsQuery,
  useFetchAskedQuestionsQuery,
  useAskQuestionMutation,
  useAnswerQuestionMutation,
  useAcceptAnswerMutation,
  useUpdateAskedQuestionMutation,
} = qnaApi;
