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
  AskedQuestionRecordDto,
  AskedQuestionV2,
  NonGeoQuestionTemplateDto,
  QuestionTemplateDto,
  QuestionTemplateV2,
  classifyQuestionTemplatesV2,
  fromAskedQuestionV2List,
  fromQuestionTemplateV2,
} from '../factsV2/questionPipelineTypes';

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

export interface UseGetPendingQuestionsResult {
  data: AskedQuestionRecordDto[] | undefined;
  isLoading: boolean;
}

/** GET /api/v1/qna/game/{game_id}/asked-questions?target_team_id=... —
 * src/apis/qnaApi.ts's own hook, reused directly; only the wire→DTO
 * adaptation (question_meta's nested answer_instruction_type unwrapped
 * flat, same as fromQuestionTemplateV2 does for templates) lives here.
 * Filtered client-side to unanswered rows — the real endpoint has no
 * answered= filter param of its own. That endpoint's legacy TypeScript
 * return type doesn't declare the v2 question_meta shape a real response
 * now carries, so the raw result is cast before adapting, same as
 * useGetQuestionTemplateDetail does above. */
export function useGetPendingQuestionsQuery(gameId: string | undefined, teamId: string | null): UseGetPendingQuestionsResult {
  const { data, isLoading, isFetching } = useFetchAskedQuestionsQuery(
    { gameId: gameId ?? '', targetTeamId: teamId ?? '' },
    { skip: !gameId || !teamId },
  );

  const questions = useMemo(() => {
    if (!data) return undefined;
    return fromAskedQuestionV2List(data.results as unknown as AskedQuestionV2[]).filter((q) => !q.answered);
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
 * been asked that are answered but not yet accepted. Kept in the raw wire
 * shape rather than adapted to AskedQuestionRecordDto, since accepting
 * needs the hider's actual answer_meta.result, which that DTO deliberately
 * drops (the hider-side pending list has no answer yet to carry). */
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
