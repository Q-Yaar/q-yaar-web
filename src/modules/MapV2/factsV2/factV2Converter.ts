/**
 * Reads a raw /facts/ row that's shaped like FactsV2 (op_type/op_meta)
 * straight through. useAcceptAnswersFlow.ts's createFact call is the one
 * place that writes a fact in this shape; a row from before this pipeline
 * existed (a different op_type vocabulary entirely — draw-circle,
 * split-by-direction, ...) doesn't match isOpType and is dropped by
 * useFactsLayers.ts's filter rather than converted.
 */
import { Fact } from '../../../models/Fact';
import { FACT_TYPE, FactDto, isOpType } from './factTypes';

export function fromFactV2(raw: Fact): FactDto | null {
  if (raw.fact_type !== FACT_TYPE.GEO) return null;
  const { op_type, op_meta, question_id, answer_id } = raw.fact_info ?? {};
  if (!isOpType(op_type) || !op_meta || typeof op_meta !== 'object') return null;

  return {
    fact_id: raw.fact_id,
    fact_type: FACT_TYPE.GEO,
    question_id: typeof question_id === 'string' ? question_id : raw.fact_id,
    answer_id: typeof answer_id === 'string' ? answer_id : raw.fact_id,
    fact_info: { op_type, op_meta: op_meta as FactDto['fact_info']['op_meta'] },
    created: raw.created,
    modified: raw.modified,
  };
}
