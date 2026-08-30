/**
 * The FactsV2 question pipeline's API layer. Question templates (stage 1)
 * are now real — the backend supports the v2 contract — wired through
 * qnaTemplatesApi.ts (list) and src/apis/qnaApi.ts's own detail endpoint
 * (identical URL, reused rather than duplicated). Asking a question,
 * answering one, and listing pending questions (stages 2-3) stay mocked
 * below: there's no contract for those endpoints yet, so wiring them would
 * mean guessing shapes rather than building against something real. Their
 * hook names/shapes are deliberately RTK-Query-flavored
 * ({data, isLoading} / [trigger, {isLoading}]) so swapping them for real
 * endpoints later, once there's a contract for them too, is a one-file
 * change the same way the template hooks just were.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { qnaApi } from '../../../apis/qnaApi';
import { useFetchQuestionTemplatesV2Query } from './qnaTemplatesApi';
import { Answer, OpType } from '../factsV2/factTypes';
import {
  AnswerRecordDto,
  AskedQuestionRecordDto,
  NonGeoQuestionTemplateDto,
  QuestionTemplateDto,
  QuestionTemplateV2,
  classifyQuestionTemplatesV2,
  fromQuestionTemplateV2,
} from '../factsV2/questionPipelineTypes';
import { MOCK_PENDING_QUESTIONS } from '../factsV2/mockPendingQuestions';

const MOCK_LATENCY_MS = 350;

export interface UseGetQuestionTemplatesResult {
  data: QuestionTemplateDto[] | undefined;
  isLoading: boolean;
}

/** GET /api/v1/qna/questions/ (qnaTemplatesApi.ts) — the map-answerable
 * half of the response: every row with a real answer_instruction_meta. */
export function useGetQuestionTemplatesQuery(): UseGetQuestionTemplatesResult {
  const { data, isLoading, isFetching } = useFetchQuestionTemplatesV2Query();
  const templates = useMemo(() => (data ? classifyQuestionTemplatesV2(data).geo : undefined), [data]);
  return { data: templates, isLoading: isLoading || isFetching };
}

export interface UseGetNonGeoQuestionTemplatesResult {
  data: NonGeoQuestionTemplateDto[] | undefined;
  isLoading: boolean;
}

/** Same GET /api/v1/qna/questions/ call — RTK Query dedupes the identical
 * request with useGetQuestionTemplatesQuery's, one network round trip
 * either way. The other half of the split: pre-v2 rows with no answer plan
 * at all (§2.03), listed separately since a NonGeoQuestionTemplateDto
 * isn't map-answerable. */
export function useGetNonGeoQuestionTemplatesQuery(): UseGetNonGeoQuestionTemplatesResult {
  const { data, isLoading, isFetching } = useFetchQuestionTemplatesV2Query();
  const templates = useMemo(() => (data ? classifyQuestionTemplatesV2(data).nonGeo : undefined), [data]);
  return { data: templates, isLoading: isLoading || isFetching };
}

export interface UseGetQuestionTemplateDetailResult {
  isLoading: boolean;
}

/** GET /api/v1/qna/categories/{category_id}/questions/{question_template_id}
 * — the exact URL src/apis/qnaApi.ts's fetchQuestionTemplateDetails already
 * calls, reused here via its auto-generated lazy hook (RTK Query generates
 * one for every builder.query endpoint whether or not the defining file
 * re-exports it) rather than duplicated. That endpoint's legacy TypeScript
 * return type doesn't declare the v2 answer_instruction_meta field a real
 * response now also carries, so the raw result is cast before adapting.
 * The wizard calls this once a template is picked, so the zone picker can
 * scope itself to exactly what the template allows instead of every zone
 * that exists. */
export function useGetQuestionTemplateDetail(): [
  (categoryId: string, questionTemplateId: string) => Promise<QuestionTemplateDto | undefined>,
  UseGetQuestionTemplateDetailResult,
] {
  const [trigger, { isLoading }] = qnaApi.useLazyFetchQuestionTemplateDetailsQuery();

  const fetchDetail = useCallback((categoryId: string, questionTemplateId: string): Promise<QuestionTemplateDto | undefined> => {
    return trigger({ categoryId, questionId: questionTemplateId })
      .unwrap()
      .then((wire) => fromQuestionTemplateV2(wire as unknown as QuestionTemplateV2) ?? undefined)
      .catch((err) => {
        console.warn('[MapV2] Failed to fetch question template detail', err);
        return undefined;
      });
  }, [trigger]);

  return [fetchDetail, { isLoading }];
}

export interface AskQuestionInput {
  question_template_id: string;
  rendered_question: string;
  answer_instruction_type: OpType;
  resolved_slots: Record<string, unknown>;
  asserted_answer: Answer;
}

export interface AskQuestionResult {
  question_id: string;
  created: string;
}

export interface UseAskQuestionMutationResult {
  isLoading: boolean;
}

/** Stand-in for POST /qna/v2/questions/:id/ask — mints a question_id after
 * a simulated round trip. Mirrors RTK Query's mutation hook shape
 * ([trigger, {isLoading}]) so the wizard's submit handler reads the same
 * way it would against a real endpoint. */
export function useAskQuestionMutation(): [
  (input: AskQuestionInput) => Promise<AskQuestionResult>,
  UseAskQuestionMutationResult,
] {
  const [isLoading, setIsLoading] = useState(false);

  const trigger = (_input: AskQuestionInput): Promise<AskQuestionResult> => {
    setIsLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsLoading(false);
        resolve({
          question_id: `mock-asked-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created: new Date().toISOString(),
        });
      }, MOCK_LATENCY_MS);
    });
  };

  return [trigger, { isLoading }];
}

export interface UseGetPendingQuestionsResult {
  data: AskedQuestionRecordDto[] | undefined;
  isLoading: boolean;
}

/** Stand-in for GET /qna/v2/asked-questions/?answered=false — every
 * question awaiting the hider's answer (mockPendingQuestions.ts). teamId is
 * accepted for API shape parity with a real, team-scoped endpoint; the mock
 * data itself isn't keyed by team. */
export function useGetPendingQuestionsQuery(teamId: string | null): UseGetPendingQuestionsResult {
  const [data, setData] = useState<AskedQuestionRecordDto[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (cancelled) return;
      setData(MOCK_PENDING_QUESTIONS);
      setIsLoading(false);
    }, MOCK_LATENCY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [teamId]);

  return { data, isLoading };
}

export interface AnswerQuestionInput {
  question_id: string;
  value: boolean;
}

export interface UseAnswerQuestionMutationResult {
  isLoading: boolean;
}

/** Stand-in for PATCH /qna/v2/asked-questions/:id/answer — mints an
 * AnswerRecordDto (stage 3) after a simulated round trip, exactly the shape
 * questionPipelineTypes.ts's toFactRecord expects to compose into a Fact
 * (stage 4). */
export function useAnswerQuestionMutation(): [
  (input: AnswerQuestionInput) => Promise<AnswerRecordDto>,
  UseAnswerQuestionMutationResult,
] {
  const [isLoading, setIsLoading] = useState(false);

  const trigger = (input: AnswerQuestionInput): Promise<AnswerRecordDto> => {
    setIsLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsLoading(false);
        resolve({
          answer_id: `mock-answer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question_id: input.question_id,
          value: input.value,
          answered_at: new Date().toISOString(),
        });
      }, MOCK_LATENCY_MS);
    });
  };

  return [trigger, { isLoading }];
}
