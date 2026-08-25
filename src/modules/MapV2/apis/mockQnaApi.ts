/**
 * Mock API layer for the FactsV2 question pipeline — everything the wizard
 * needs to fetch templates and submit a question, shaped exactly like a
 * real API would return it, so the UI layer only ever sees QuestionTemplateDto
 * (and the ask-question ack), never the mock JSON or converters directly.
 * Swapping this for a real RTK Query endpoint later is a one-file change:
 * the hook names and shapes are deliberately RTK-Query-flavored
 * ({data, isLoading} / [trigger, {isLoading}]) even though the "network"
 * here is just a setTimeout over static JSON.
 */
import { useCallback, useEffect, useState } from 'react';
import templatesJson from '../mock/v2_question_templates.output.json';
import nonGeoTemplatesJson from '../mock/v2_non_geo_templates.output.json';
import { Answer, OpType } from '../factsV2/factTypes';
import { AnswerRecordDto, AskedQuestionRecordDto, NonGeoQuestionTemplateDto, PlaceholderSpec, QuestionTemplateDto, SUBOP_CONTRACT } from '../factsV2/questionPipelineTypes';
import { POLYGON_CATALOG, REGION_KIND, RegionKind } from '../factsV2/geometryAssets';
import { MOCK_PENDING_QUESTIONS } from '../factsV2/mockPendingQuestions';

const MOCK_LATENCY_MS = 350;

export interface UseGetQuestionTemplatesResult {
  data: QuestionTemplateDto[] | undefined;
  isLoading: boolean;
}

/** Stand-in for GET /qna/v2/questions/ — the pre-converted output of
 * legacyTemplateConverter.ts (see mock/v2_question_templates.output.json),
 * served back after a simulated round trip. */
export function useGetQuestionTemplatesQuery(): UseGetQuestionTemplatesResult {
  const [data, setData] = useState<QuestionTemplateDto[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (cancelled) return;
      setData(templatesJson as unknown as QuestionTemplateDto[]);
      setIsLoading(false);
    }, MOCK_LATENCY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { data, isLoading };
}

export interface UseGetNonGeoQuestionTemplatesResult {
  data: NonGeoQuestionTemplateDto[] | undefined;
  isLoading: boolean;
}

/** Stand-in for GET /qna/v2/questions/?geo=false — question types with no
 * geo mechanism (Photos, ...), listed separately from
 * useGetQuestionTemplatesQuery since a NonGeoQuestionTemplateDto isn't
 * map-answerable at all (see questionPipelineTypes.ts). The wizard shows
 * these below the real question list purely for visibility. */
export function useGetNonGeoQuestionTemplatesQuery(): UseGetNonGeoQuestionTemplatesResult {
  const [data, setData] = useState<NonGeoQuestionTemplateDto[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (cancelled) return;
      setData(nonGeoTemplatesJson as unknown as NonGeoQuestionTemplateDto[]);
      setIsLoading(false);
    }, MOCK_LATENCY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { data, isLoading };
}

/** Which polygon catalog kind a POLYGON placeholder's own name implies —
 * "metro_line" clearly wants metro catchments, "gba_corporation"/"region"
 * clearly want corporations. A placeholder name this doesn't recognise
 * falls back to the whole catalog rather than guessing wrong. This whole
 * function is a mock-only stand-in for whatever curation a real detail
 * endpoint would already have done — the point isn't the heuristic, it's
 * that every value it returns is a real POLYGON_CATALOG key ("options are
 * from asset content only"), never an arbitrary string. */
function catalogKindForPlaceholder(placeholderKey: string): RegionKind | null {
  const key = placeholderKey.toLowerCase();
  if (key.includes('metro') || key.includes('line')) return REGION_KIND.METRO_CATCHMENT;
  if (key.includes('corp') || key.includes('gba') || key.includes('region')) return REGION_KIND.CORPORATION;
  return null;
}

/** Every placeholder key bound to a POLYGON-kind slot in this template —
 * derived from SUBOP_CONTRACT, not the slot's name, so this stays correct
 * even for an op_type that names its polygon slot something other than
 * "polygon". */
function polygonPlaceholderKeys(template: QuestionTemplateDto): Set<string> {
  const contract = SUBOP_CONTRACT[template.answer_instruction_type];
  const keys = new Set<string>();
  for (const [slotName, binding] of Object.entries(template.slot_bindings)) {
    if (binding.source === 'PLACEHOLDER' && contract.slots[slotName] === 'POLYGON') {
      keys.add(binding.placeholder);
    }
  }
  return keys;
}

function withPlaceholderAllowedValues(template: QuestionTemplateDto): QuestionTemplateDto {
  const polygonKeys = polygonPlaceholderKeys(template);
  const placeholders: Record<string, PlaceholderSpec> = {};
  for (const [key, spec] of Object.entries(template.placeholders)) {
    const alreadyHasOptions = spec.allowed_values && spec.allowed_values.length > 0;
    if (alreadyHasOptions || !polygonKeys.has(key)) {
      placeholders[key] = spec;
      continue;
    }
    const kind = catalogKindForPlaceholder(key);
    const allowed = POLYGON_CATALOG.filter((entry) => !kind || entry.kind === kind).map((entry) => entry.key);
    placeholders[key] = { ...spec, allowed_values: allowed };
  }
  return { ...template, placeholders };
}

export interface UseGetQuestionTemplateDetailResult {
  isLoading: boolean;
}

/** Stand-in for GET /qna/v2/questions/:id — the one endpoint that actually
 * carries a placeholder's allowed_values (the list endpoint above never
 * does, matching the real legacy API this whole pipeline mirrors — see
 * legacyTemplateConverter.ts's tokensInProse fallback). The wizard calls
 * this once a template is picked, so the zone picker can scope itself to
 * exactly what the template allows instead of every zone that exists. */
export function useGetQuestionTemplateDetail(): [
  (templateId: string) => Promise<QuestionTemplateDto | undefined>,
  UseGetQuestionTemplateDetailResult,
] {
  const [isLoading, setIsLoading] = useState(false);

  const trigger = useCallback((templateId: string): Promise<QuestionTemplateDto | undefined> => {
    setIsLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsLoading(false);
        const templates = templatesJson as unknown as QuestionTemplateDto[];
        const base = templates.find((t) => t.question_template_id === templateId);
        resolve(base ? withPlaceholderAllowedValues(base) : undefined);
      }, MOCK_LATENCY_MS);
    });
  }, []);

  return [trigger, { isLoading }];
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
