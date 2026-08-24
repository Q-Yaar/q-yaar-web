/**
 * Synthetic "pending" (unanswered) questions for the Hider's Answer
 * Questions flow — apis/mockQnaApi.ts's useGetPendingQuestionsQuery serves
 * these. Every real captured legacy sample in mock/legacy_*.ts already has
 * answered: true, so there's nothing to convert here; this is hand-built
 * instead, covering three different op_types (a POLYGON_INSIDE zone match,
 * a POINT_BUFFER_INSIDE radius check, a POINT_SPLIT direction check) so the
 * answer-preview exercises more than one shape.
 */
import { ANSWER } from './factTypes';
import { AskedQuestionRecordDto } from './questionPipelineTypes';

const CREATED_AT = new Date().toISOString();

export const MOCK_PENDING_QUESTIONS: AskedQuestionRecordDto[] = [
  {
    question_id: 'pending-radar-1',
    question_template_id: '06e9bee5-a181-4dce-9792-497ead9732f8',
    template: 'Are you within {{ distance }} metres of me?',
    rendered_question: 'Are you within 2000 metres of me?',
    category: { category_id: '02588604-868f-41d1-ab96-ad4f92f3514e', category_name: 'Radar', priority: 3 },
    answer_instruction_type: 'POINT_BUFFER_INSIDE',
    question_meta: {
      placeholder_values: { distance: 2000 },
      resolved_slots: { point: { lat: '12.9716', lon: '77.5946', source: 'ASKER_LOCATION' }, radius: 2000 },
      asserted_answer: ANSWER.INSIDE,
      location_points: [{ lat: '12.9716', lon: '77.5946' }],
    },
    answered: false,
    accepted: false,
    created: CREATED_AT,
    modified: CREATED_AT,
  },
  {
    question_id: 'pending-matching-1',
    question_template_id: '806a962d-cea4-4a47-9989-189c71293639',
    template: 'I am currently in {{ gba_corporation }} GBA Corporation. Are you in the same GBA Corporation as me?',
    rendered_question: 'I am currently in Bengaluru East City Corporation. Are you in the same GBA Corporation as me?',
    category: { category_id: 'aa020bb6-4d12-4f8c-ae9b-d25a3b3aef93', category_name: 'Matching', priority: 6 },
    answer_instruction_type: 'POLYGON_INSIDE',
    question_meta: {
      placeholder_values: { gba_corporation: 'BLR_EAST_CORP' },
      resolved_slots: { polygon: 'BLR_EAST_CORP' },
      asserted_answer: ANSWER.INSIDE,
      location_points: [],
    },
    answered: false,
    accepted: false,
    created: CREATED_AT,
    modified: CREATED_AT,
  },
  {
    question_id: 'pending-relative-1',
    question_template_id: 'c5d88c25-9488-4afc-88cb-081b8c6fcf3f',
    template: 'Are you {{ direction }} of me?',
    rendered_question: 'Are you north of me?',
    category: { category_id: '47cc4c38-c578-4ab0-b856-96234c5fe805', category_name: 'Relative', priority: 1 },
    answer_instruction_type: 'POINT_SPLIT',
    question_meta: {
      placeholder_values: { direction: 'N' },
      resolved_slots: { point: { lat: '12.99', lon: '77.61', source: 'ASKER_LOCATION' } },
      asserted_answer: ANSWER.N,
      location_points: [{ lat: '12.99', lon: '77.61' }],
    },
    answered: false,
    accepted: false,
    created: CREATED_AT,
    modified: CREATED_AT,
  },
];
