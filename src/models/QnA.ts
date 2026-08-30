export interface Reward {
  reward_id: string;
  reward_name: string;
  reward_type: string;
  reward_meta: {
    draw: number;
    pick: number;
    // Add other fields if necessary
  };
  created: string;
  modified: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  reward: Reward;
  priority: number;
  created: string;
  modified: string;
}

export interface QuestionPlaceholder {
  required: boolean;
  allowed_values: string[];
}

export interface QuestionTemplate {
  question_id: string;
  template: string;
  category: Category;
  created: string;
  modified: string;
  placeholders?: Record<string, QuestionPlaceholder>; // Optional as it might not be in all responses
}

import { UnknownQuestionMeta, LocationPoint } from './QuestionMeta';

export interface AskedQuestion {
  question_id: string;
  question_template_id: string;
  rendered_question: string;
  template: string;
  category: Category;
  geo?: {
    count: number;
  };
  question_meta: UnknownQuestionMeta;
  answer_meta?: {
    answered?: boolean;
    result?: string;
    metadata?: {
      text: string;
    };
  };
  fact_meta?: FactMeta;
  answered?: boolean;
  accepted?: boolean;
  reward?: Reward;
  created: string;
  modified: string;
}

import type { QuestionMetaByCategory, BaseQuestionMeta, FactMeta } from './QuestionMeta';

export interface AskQuestionRequest<C extends keyof QuestionMetaByCategory = never> {
  target_team_id: string;
  chosen_placeholders: Record<string, any>;
  question_meta: C extends keyof QuestionMetaByCategory ? QuestionMetaByCategory[C] : BaseQuestionMeta;
  fact_meta?: FactMeta;
}

// Backward compatible type for when category is unknown
export interface GenericAskQuestionRequest {
  target_team_id: string;
  chosen_placeholders: Record<string, any>;
  question_meta: BaseQuestionMeta;
  fact_meta?: FactMeta;
}

/**
 * A single resolved placeholder in the shape the real v2 API uses on both
 * sides of asking — the same tagged {type, value, display_name} triple a
 * template's own allowed_values come in (see MapV2's questionPipelineTypes.ts
 * PlaceholderAllowedValue, which this deliberately mirrors structurally
 * rather than importing, to keep this shared models file free of a
 * dependency on a feature module).
 */
export interface AskedPlaceholderValue {
  type: 'geometry' | 'text' | 'number';
  value: unknown;
  display_name: string;
}

/**
 * Ask-to-Fact v2 request body for askQuestion — question_meta nests
 * resolved_slots/asserted_answer/resolved_placeholders, computed
 * client-side by MapV2's wizard, replacing the legacy flat
 * chosen_placeholders/question_meta shape above for v2-templated
 * questions. The same nested question_meta shape comes back on the
 * AskedQuestion this mutation resolves to (and on every asked-question
 * record fetched afterwards), just with additional record fields (answered,
 * accepted, reward, ...) layered around it. askQuestion accepts either this
 * or the legacy body shape (see qnaApi.ts); this one is additive, not a
 * replacement, so the legacy caller (QuestionAndAnswer/AskQuestionModule.tsx)
 * is untouched.
 */
export interface AskQuestionRequestV2 {
  target_team_id: string;
  question_meta: {
    answer_instruction_type: string;
    asserted_answer: string;
    resolved_slots: Record<string, unknown>;
    resolved_placeholders: Record<string, AskedPlaceholderValue>;
  };
}

export interface AnswerQuestionRequest {
  answer_meta: {
    result: boolean | string;
    metadata?: Record<string, any>;
  };
}
