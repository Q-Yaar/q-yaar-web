/**
 * Converted output of legacy_questions_template_response.ts — the real
 * legacy template list response, run through
 * factsV2/legacyTemplateConverter.ts. See that file for what each legacy
 * category maps to (op_type, slot_bindings, asserted_answer) and why; this
 * file exists so the conversion runs once at import time rather than being
 * redone wherever mock v2 template data is needed.
 *
 * "Photos" converts to nothing (no SUBOP_CONTRACT op exists for it), so
 * v2QuestionTemplates has fewer entries than templateResponse.results.
 */
import { templateResponse } from './legacy_questions_template_response';
import { QuestionTemplate } from '../../../models/QnA';
import { convertLegacyTemplates } from '../factsV2/legacyTemplateConverter';

// The mock JSON has a couple of fields (location_points sometimes null,
// answer_instruction_type in a vocabulary QuestionTemplate doesn't model)
// that don't round-trip cleanly through strict structural typing — cast
// once here rather than loosening the real QuestionTemplate type for it.
const legacyTemplates = templateResponse.results as unknown as QuestionTemplate[];

export const v2QuestionTemplates = convertLegacyTemplates(legacyTemplates);
