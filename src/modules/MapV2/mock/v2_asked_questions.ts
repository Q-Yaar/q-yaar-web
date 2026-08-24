/**
 * Converted output of legacy_asked_questions_response.ts — the real legacy
 * asked-questions list response, run through
 * factsV2/legacyAskedQuestionConverter.ts. Exposes all three stages that
 * conversion produces from the same source data: the AskedQuestionRecordDto
 * itself, the AnswerRecordDto extracted from its embedded answer_meta, and
 * — for whichever ones have both — the composed FactDto ready for the
 * existing factToRegion()/computeFactsArea() pipeline.
 *
 * "Photos" questions convert to nothing in all three arrays (no
 * SUBOP_CONTRACT op exists for them); a Radar question with a non-numeric
 * radius ("custom" — not yet resolved to a real number) converts to
 * nothing in v2AskedQuestions/v2Facts for the same reason legacyFactConverter
 * skips facts it can't resolve.
 */
import { askedQuestionsResponse } from './legacy_asked_questions_response';
import { AskedQuestion } from '../../../models/QnA';
import { FactDto } from '../factsV2/factTypes';
import {
  convertLegacyAnswer,
  convertLegacyAskedQuestion,
  convertLegacyAskedQuestionToFact,
} from '../factsV2/legacyAskedQuestionConverter';
import { AnswerRecordDto, AskedQuestionRecordDto } from '../factsV2/questionPipelineTypes';

// Same rationale as v2_question_templates.ts's cast — real payloads carry a
// couple of shapes (location_points: null on non-geo questions) that don't
// round-trip through AskedQuestion's strict optional-array typing.
const legacyQuestions = askedQuestionsResponse.results as unknown as AskedQuestion[];

export const v2AskedQuestions: AskedQuestionRecordDto[] = legacyQuestions
  .map(convertLegacyAskedQuestion)
  .filter((question): question is AskedQuestionRecordDto => question !== null);

export const v2Answers: AnswerRecordDto[] = legacyQuestions
  .map(convertLegacyAnswer)
  .filter((answer): answer is AnswerRecordDto => answer !== null);

export const v2Facts: FactDto[] = legacyQuestions
  .map(convertLegacyAskedQuestionToFact)
  .filter((fact): fact is FactDto => fact !== null);
