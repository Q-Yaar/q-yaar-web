import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
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
import { GAME_MODULE, QNA_MODULE } from '../constants/modules';

// MOCK DATA
const MOCK_CATEGORIES: Category[] = [
  {
    category_id: 'c1',
    category_name: 'Action',
    priority: 1,
    created: '',
    modified: '',
    reward: {
      reward_id: 'r1',
      reward_name: 'Draw 1',
      reward_type: 'CARD',
      reward_meta: { draw: 1, pick: 1 },
      created: '',
      modified: '',
    },
  },
  {
    category_id: 'c2',
    category_name: 'Trivia',
    priority: 2,
    created: '',
    modified: '',
    reward: {
      reward_id: 'r2',
      reward_name: 'Draw 2 Pick 1',
      reward_type: 'CARD',
      reward_meta: { draw: 2, pick: 1 },
      created: '',
      modified: '',
    },
  },
];

const MOCK_TEMPLATES: QuestionTemplate[] = [
  {
    question_id: 'q1',
    template: 'Who is the tallest person in {{ team_name }}?',
    category: MOCK_CATEGORIES[0],
    created: '',
    modified: '',
    placeholders: { team_name: { required: true, allowed_values: [] } },
  },
  {
    question_id: 'q2',
    template: 'Sing a song about {{ topic }}',
    category: MOCK_CATEGORIES[0],
    created: '',
    modified: '',
    placeholders: {
      topic: { required: true, allowed_values: ['Love', 'War', 'Food'] },
    },
  },
];

let MOCK_ASKED_QUESTIONS: AskedQuestion[] = [
  {
    question_id: 'aq1',
    question_template_id: 'q1',
    rendered_question: 'Who is the tallest person in Team A?',
    template: 'Who is the tallest person in {{ team_name }}?',
    category: MOCK_CATEGORIES[0],
    question_meta: { myLocation: 'Home' },
    answer_meta: { answered: false, result: '' },
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  {
    question_id: 'aq2',
    question_template_id: 'q2',
    rendered_question: 'Sing a song about Love',
    template: 'Sing a song about {{ topic }}',
    category: MOCK_CATEGORIES[0],
    question_meta: { myLocation: 'Park' },
    answer_meta: { answered: true, result: 'HIT' },
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
];

export const qnaApi = api.injectEndpoints({
  endpoints: (builder) => ({
    fetchCategories: builder.query<ListResponse<Category>, void>({
      async queryFn() {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
        return {
          data: {
            count: MOCK_CATEGORIES.length,
            next: '',
            previous: '',
            results: MOCK_CATEGORIES,
          },
        };
      },
      providesTags: [QNA_MODULE],
    }),
    fetchQuestionTemplates: builder.query<
      ListResponse<QuestionTemplate>,
      { categoryId: string; gameId?: string }
    >({
      async queryFn({ categoryId }) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Filter purely for mock effect, or just return all
        const templates = MOCK_TEMPLATES;
        return {
          data: {
            count: templates.length,
            next: '',
            previous: '',
            results: templates,
          },
        };
      },
      providesTags: [QNA_MODULE],
    }),
    fetchAskedQuestions: builder.query<
      ListResponse<AskedQuestion>,
      { gameId: string; targetTeamId?: string }
    >({
      async queryFn() {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          data: {
            count: MOCK_ASKED_QUESTIONS.length,
            next: '',
            previous: '',
            results: MOCK_ASKED_QUESTIONS,
          },
        };
      },
      providesTags: [QNA_MODULE],
    }),
    askQuestion: builder.mutation<
      AskedQuestion,
      { gameId: string; questionId: string; body: AskQuestionRequest }
    >({
      async queryFn({ questionId, body }) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const template = MOCK_TEMPLATES.find(
          (t) => t.question_id === questionId,
        );
        if (!template)
          return { error: { status: 404, data: 'Template not found' } };

        const newQuestion: AskedQuestion = {
          question_id: `aq_${Date.now()}`,
          question_template_id: template.question_id,
          rendered_question: template.template + ' (Mock Rendered)', // Simplified render
          template: template.template,
          category: template.category,
          question_meta: body.question_meta as any,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        };
        MOCK_ASKED_QUESTIONS.push(newQuestion);
        return { data: newQuestion };
      },
      invalidatesTags: [QNA_MODULE],
    }),
    answerQuestion: builder.mutation<
      AskedQuestion,
      { gameId: string; askedQuestionId: string; body: AnswerQuestionRequest }
    >({
      async queryFn({ askedQuestionId, body }) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const index = MOCK_ASKED_QUESTIONS.findIndex(
          (q) => q.question_id === askedQuestionId,
        );
        if (index === -1)
          return { error: { status: 404, data: 'Question not found' } };

        MOCK_ASKED_QUESTIONS[index] = {
          ...MOCK_ASKED_QUESTIONS[index],
          answer_meta: body.answer_meta,
          modified: new Date().toISOString(),
        };
        return { data: MOCK_ASKED_QUESTIONS[index] };
      },
      invalidatesTags: [QNA_MODULE],
    }),
  }),
});

export const {
  useFetchCategoriesQuery,
  useFetchQuestionTemplatesQuery,
  useFetchAskedQuestionsQuery,
  useAskQuestionMutation,
  useAnswerQuestionMutation,
} = qnaApi;
