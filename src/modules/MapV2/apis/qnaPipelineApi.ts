/**
 * The FactsV2 question pipeline's API layer. Question templates (stage 1),
 * asking a question (stage 2), listing pending questions, and answering one
 * (stage 3) are all real now — wired through qnaTemplatesApi.ts (list),
 * src/apis/qnaApi.ts's own detail/asked-questions endpoints (identical
 * URLs, reused rather than duplicated), and src/apis/qnaApi.ts's
 * askQuestion/answerQuestion mutations (useDraftFactWizard.ts and
 * useAnswerQuestionsFlow.ts import those two directly — see
 * models/QnA.ts's AskQuestionRequestV2 and questionPipelineTypes.ts's
 * AskedQuestionV2 for the v2 body/response shapes).
 */
import { useCallback, useMemo } from 'react';
import { qnaApi, useFetchAskedQuestionsQuery } from '../../../apis/qnaApi';
import { useFetchQuestionTemplatesV2Query } from './qnaTemplatesApi';
import {
  AskedQuestionV2,
  GeoQuestionTemplate,
  QuestionTemplateV2,
  classifyQuestionTemplatesV2,
  isGeoTemplate,
} from '../factsV2/questionPipelineTypes';

export interface UseGetQuestionTemplatesResult {
  data: GeoQuestionTemplate[] | undefined;
  isLoading: boolean;
}

/** GET /api/v1/qna/questions/ (qnaTemplatesApi.ts) — the map-answerable
 * half of the response: every row with a real answer_instruction_meta. */
export function useGetQuestionTemplatesQuery(gameId: string | undefined): UseGetQuestionTemplatesResult {
  const { data, isLoading, isFetching } = useFetchQuestionTemplatesV2Query(gameId ? { game_id: gameId } : undefined);
  const templates = useMemo(() => (data ? classifyQuestionTemplatesV2(data).geo : undefined), [data]);
  return { data: templates, isLoading: isLoading || isFetching };
}

export interface UseGetNonGeoQuestionTemplatesResult {
  data: QuestionTemplateV2[] | undefined;
  isLoading: boolean;
}

/** Same GET /api/v1/qna/questions/ call — RTK Query dedupes the identical
 * request with useGetQuestionTemplatesQuery's, one network round trip
 * either way. The other half of the split: pre-v2 rows with no answer plan
 * at all (§2.03), listed separately since they aren't map-answerable. */
export function useGetNonGeoQuestionTemplatesQuery(gameId: string | undefined): UseGetNonGeoQuestionTemplatesResult {
  const { data, isLoading, isFetching } = useFetchQuestionTemplatesV2Query(gameId ? { game_id: gameId } : undefined);
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
 * response now also carries, so the raw result is cast before narrowing.
 * The wizard calls this once a template is picked, so the zone picker can
 * scope itself to exactly what the template allows instead of every zone
 * that exists. */
export function useGetQuestionTemplateDetail(): [
  (categoryId: string, questionTemplateId: string) => Promise<GeoQuestionTemplate | undefined>,
  UseGetQuestionTemplateDetailResult,
] {
  const [trigger, { isLoading }] = qnaApi.useLazyFetchQuestionTemplateDetailsQuery();

  const fetchDetail = useCallback((categoryId: string, questionTemplateId: string): Promise<GeoQuestionTemplate | undefined> => {
    return trigger({ categoryId, questionId: questionTemplateId })
      .unwrap()
      .then((wire) => {
        const template = wire as unknown as QuestionTemplateV2;
        return isGeoTemplate(template) ? template : undefined;
      })
      .catch((err) => {
        console.warn('[MapV2] Failed to fetch question template detail', err);
        return undefined;
      });
  }, [trigger]);

  return [fetchDetail, { isLoading }];
}

export interface UseGetPendingQuestionsResult {
  data: AskedQuestionV2[] | undefined;
  isLoading: boolean;
}

/** GET /api/v1/qna/game/{game_id}/asked-questions?target_team_id=... —
 * src/apis/qnaApi.ts's own hook, reused directly, filtered client-side to
 * unanswered rows since the real endpoint has no answered= filter param of
 * its own. That endpoint's legacy TypeScript return type doesn't declare
 * the v2 question_meta shape a real response now carries, so the raw
 * result is cast, same as useGetAnsweredQuestionsQuery does below. */
export function useGetPendingQuestionsQuery(gameId: string | undefined, teamId: string | null): UseGetPendingQuestionsResult {
  const { data, isLoading, isFetching } = useFetchAskedQuestionsQuery(
    { gameId: gameId ?? '', targetTeamId: teamId ?? '' },
    { skip: !gameId || !teamId },
  );

  const questions = useMemo(() => {
    if (!data) return undefined;
    return (data.results as unknown as AskedQuestionV2[]).filter((q) => !q.answered);
  }, [data]);

  return { data: questions, isLoading: isLoading || isFetching };
}

export interface UseGetAnsweredQuestionsResult {
  data: AskedQuestionV2[] | undefined;
  isLoading: boolean;
}

/** Same GET /api/v1/qna/game/{game_id}/asked-questions call
 * useGetPendingQuestionsQuery makes (RTK Query dedupes identical args, one
 * network round trip either way) — the Seeker's side: rows this team has
 * been asked that are answered but not yet accepted. Accepting needs the
 * hider's actual answer_meta.result, which is why this stays filtered by
 * answered/accepted rather than by the pending list's own !answered. */
export function useGetAnsweredQuestionsQuery(gameId: string | undefined, teamId: string | null): UseGetAnsweredQuestionsResult {
  const { data, isLoading, isFetching } = useFetchAskedQuestionsQuery(
    { gameId: gameId ?? '', targetTeamId: teamId ?? '' },
    { skip: !gameId || !teamId },
  );

  const questions = useMemo(() => {
    if (!data) return undefined;
    return (data.results as unknown as AskedQuestionV2[]).filter((q) => q.answered && !q.accepted);
  }, [data]);

  return { data: questions, isLoading: isLoading || isFetching };
}
