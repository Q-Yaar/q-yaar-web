/**
 * Reads a raw /facts/ row that's already shaped like FactsV2 (op_type/
 * op_meta) straight through — the counterpart to legacyFactConverter.ts,
 * which maps the *old* per-tool op_types (draw-circle, split-by-direction,
 * ...) onto FactsV2. useAcceptAnswersFlow.ts's createFact call is the one
 * place that writes a fact in this shape today; useFactsLayers.ts tries
 * this converter first and only falls back to the legacy one when a row
 * isn't FactsV2-shaped, since the real /facts/ endpoint still serves a mix
 * of both until every legacy fact is migrated.
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
