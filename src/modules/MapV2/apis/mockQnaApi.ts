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
import { useEffect, useState } from 'react';
import templatesJson from '../mock/v2_question_templates.output.json';
import { Answer, OpType } from '../factsV2/factTypes';
import { QuestionTemplateDto } from '../factsV2/questionPipelineTypes';

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
