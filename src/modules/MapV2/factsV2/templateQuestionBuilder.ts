/**
 * Turns a real GeoQuestionTemplate (fetched via apis/qnaPipelineApi.ts) plus
 * whatever the asker has filled in — resolved points, chosen placeholder
 * values — into a DraftAskedQuestion, generically across every op_type: one
 * slot_bindings entry -> one resolved_slots entry, driven entirely by each
 * binding's `source`, never a hardcoded per-category branch. This is what
 * replaced the old buildDraftQuestion.ts, which only knew about three
 * hand-picked "wizard kinds" (circle/zone/hotter-colder) instead of
 * whatever templates the API actually returns.
 */
import { Answer, ResolvedLatLon } from './factTypes';
import { AskedQuestionV2, DraftAskedQuestion, GeoQuestionTemplate, PlaceholderAllowedValue, PlaceholderSpec, SlotBinding, SUBOP_CONTRACT, questionTemplateId } from './questionPipelineTypes';

export const formatDistance = (metres: number): string => (
  metres >= 1000 ? `${(metres / 1000).toFixed(metres % 1000 === 0 ? 0 : 1)} km` : `${metres} m`
);

/** Human-readable stand-in for a resolved point — never shows raw lat/lon.
 * A GPS fix always reads as "your location"; anything else falls back to
 * whatever short label the caller passes, so two points in the same
 * sentence still read as distinct without spelling out coordinates. */
export const describeResolvedPoint = (p: ResolvedLatLon | null, fallback = 'a point'): string => {
  if (!p) return fallback;
  if (p.source === 'ASKER_LOCATION') return 'your location';
  return fallback;
};

const ANSWER_WORD: Record<Answer, string> = {
  INSIDE: 'inside', OUTSIDE: 'outside',
  NORTH: 'north', SOUTH: 'south', EAST: 'east', WEST: 'west',
  HOTTER: 'hotter', COLDER: 'colder',
};

export type SlotValue = ResolvedLatLon | string | number;

/** Every point-producing slot (ASKER_LOCATION or MAP_POINT) the asker has
 * resolved so far, keyed by slot name. */
export type PointValues = Record<string, ResolvedLatLon>;

/** Every PLACEHOLDER-sourced value chosen so far, keyed by placeholder
 * name — covers both a slot's placeholder (a zone's registry key, a
 * radius in metres) and the asserted_answer's placeholder (an Answer
 * letter) uniformly, since both are just "the asker picked this
 * placeholder's value." */
export type PlaceholderValues = Record<string, string | number>;

function resolveSlotValue(binding: SlotBinding, slotName: string, points: PointValues, placeholders: PlaceholderValues): SlotValue | undefined {
  switch (binding.source) {
    case 'TEMPLATE_CONSTANT':
      return binding.value;
    case 'ASKER_LOCATION':
    case 'MAP_POINT':
      return points[slotName];
    case 'PLACEHOLDER':
      return placeholders[binding.placeholder];
    default:
      return undefined;
  }
}

/** Null unless every slot the template declares has a value yet. */
export function resolveTemplateSlots(
  template: GeoQuestionTemplate,
  points: PointValues,
  placeholders: PlaceholderValues,
): Record<string, SlotValue> | null {
  const resolved: Record<string, SlotValue> = {};
  for (const [slotName, binding] of Object.entries(template.answer_instruction_meta.slot_bindings)) {
    const value = resolveSlotValue(binding, slotName, points, placeholders);
    if (value === undefined) return null;
    resolved[slotName] = value;
  }
  return resolved;
}

/** Null unless the asserted answer is resolvable yet (a TEMPLATE_CONSTANT
 * always is; a PLACEHOLDER one needs the asker to have picked it). */
export function resolveAssertedAnswer(template: GeoQuestionTemplate, placeholders: PlaceholderValues): Answer | null {
  const assertedAnswer = template.answer_instruction_meta.asserted_answer;
  if (assertedAnswer.source === 'TEMPLATE_CONSTANT') return assertedAnswer.value;
  const value = placeholders[assertedAnswer.placeholder];
  return typeof value === 'string' ? (value as Answer) : null;
}

/** True once every slot and the asserted answer both have a value — the
 * wizard's Continue button reads this directly instead of re-deriving it
 * per op_type. */
export function isTemplateComplete(template: GeoQuestionTemplate, points: PointValues, placeholders: PlaceholderValues): boolean {
  return resolveTemplateSlots(template, points, placeholders) !== null
    && resolveAssertedAnswer(template, placeholders) !== null;
}

/** The curated display name for whichever value the asker picked, if it
 * came from allowed_values — a geometry entry matches by its own `key`
 * (the actual stored/resolved value), text/number entries match by value
 * directly. Null for a free-typed value with nothing to match against. */
function allowedValueDisplayName(allowedValues: PlaceholderAllowedValue[] | undefined, value: string | number): string | null {
  const match = allowedValues?.find((v) => (v.type === 'geometry' ? v.value.key === value : v.value === value));
  return match ? match.display_name : null;
}

/** Every PLACEHOLDER-sourced value the asker has chosen, resolved to the
 * full tagged {type, value, display_name} shape the real askQuestion
 * payload's question_meta.resolved_placeholders expects — matched against
 * the template's own allowed_values when the choice came from a curated
 * list (same matching allowedValueDisplayName does), or synthesized
 * (display_name === value, as text/number) for a free-typed one. Covers
 * both a slot's own placeholder and the asserted_answer's placeholder,
 * same two sources resolveTemplateSlots/resolveAssertedAnswer draw from
 * separately. */
export function resolvePlaceholders(template: GeoQuestionTemplate, placeholders: PlaceholderValues): Record<string, PlaceholderAllowedValue> {
  const { slot_bindings, asserted_answer, placeholders: placeholderSpecs } = template.answer_instruction_meta;
  const keys = new Set<string>();
  for (const binding of Object.values(slot_bindings)) {
    if (binding.source === 'PLACEHOLDER') keys.add(binding.placeholder);
  }
  if (asserted_answer.source === 'PLACEHOLDER') keys.add(asserted_answer.placeholder);

  const resolved: Record<string, PlaceholderAllowedValue> = {};
  for (const key of Array.from(keys)) {
    const value = placeholders[key];
    if (value === undefined) continue;
    const spec = placeholderSpecs[key];
    const match = spec?.allowed_values?.find((v) => (v.type === 'geometry' ? v.value.key === value : v.value === value));
    resolved[key] = match ?? (typeof value === 'number'
      ? { type: 'number', value, display_name: String(value) }
      : { type: 'text', value: String(value), display_name: String(value) });
  }
  return resolved;
}

function slotDisplayText(binding: SlotBinding, value: SlotValue, placeholderSpec: PlaceholderSpec | undefined): string {
  if (binding.source === 'ASKER_LOCATION') return 'your location';
  if (binding.source === 'MAP_POINT') return describeResolvedPoint(value as ResolvedLatLon, 'the point you picked');
  if (typeof value !== 'string' && typeof value !== 'number') return String(value);
  // A bare number when nothing's curated — every template's own prose
  // already supplies the unit word next to {{ the placeholder }} ("...within
  // {{ distance }} metres..."), so adding one here doubles up.
  return allowedValueDisplayName(placeholderSpec?.allowed_values, value) ?? String(value);
}

/** Substitutes every {{ token }} in the template's prose with a
 * human-friendly value: a point's description, a zone's display name, a
 * formatted distance, or the asserted answer's word (e.g. "north") when
 * the token is the asserted_answer's own placeholder. A token with no
 * value yet (not chosen, or truly decorative — e.g. Thermometer's
 * "distance" placeholder isn't bound to any slot at all) is left as its
 * bare name so the sheet never shows a stray "{{ }}" while composing. */
export function buildRenderedQuestion(
  template: GeoQuestionTemplate,
  points: PointValues,
  placeholders: PlaceholderValues,
): string {
  const { slot_bindings, asserted_answer, placeholders: placeholderSpecs } = template.answer_instruction_meta;
  const placeholderText: Record<string, string> = {};

  for (const [slotName, binding] of Object.entries(slot_bindings)) {
    const value = resolveSlotValue(binding, slotName, points, placeholders);
    if (value === undefined) continue;
    if (binding.source === 'PLACEHOLDER') {
      placeholderText[binding.placeholder] = slotDisplayText(binding, value, placeholderSpecs[binding.placeholder]);
    } else if (binding.source === 'MAP_POINT' && binding.label_placeholder) {
      placeholderText[binding.label_placeholder] = slotDisplayText(binding, value, placeholderSpecs[binding.label_placeholder]);
    }
  }

  if (asserted_answer.source === 'PLACEHOLDER') {
    const key = asserted_answer.placeholder;
    const chosen = placeholders[key];
    if (typeof chosen === 'string' && chosen in ANSWER_WORD) {
      placeholderText[key] = ANSWER_WORD[chosen as Answer];
    }
  }

  return template.template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => placeholderText[token] ?? token);
}

/** Same {{ token }} substitution as buildRenderedQuestion, but for an
 * already-asked question fetched from the API (AnswerQuestionsSheet,
 * AcceptAnswersSheet) rather than one still being composed — those sheets
 * never fetch the full template, so this is driven entirely by
 * question_meta.resolved_placeholders, the same tagged {type, value,
 * display_name} triples the ask request sent, echoed back by every
 * asked-question response. A token whose resolved value happens to be a
 * legal Answer word (almost always the asserted_answer's own placeholder)
 * renders as that word (e.g. "north"), same as buildRenderedQuestion's
 * asserted_answer special-case, rather than whatever display_name the
 * template curated for the chip. A token with no resolved_placeholders
 * entry — unresolved, or a MAP_POINT label_placeholder, which
 * resolved_placeholders never carries — is left as its bare name, same
 * fallback buildRenderedQuestion uses. */
export function renderAskedQuestionText(question: AskedQuestionV2): string {
  const resolvedPlaceholders = question.question_meta.resolved_placeholders ?? {};
  return question.template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    const resolved = resolvedPlaceholders[token];
    if (!resolved) return token;
    if (resolved.type === 'text' && resolved.value in ANSWER_WORD) return ANSWER_WORD[resolved.value as Answer];
    return resolved.display_name;
  });
}

/** The slot kinds this wizard can actually render a picker for. A LINE
 * placeholder's own allowed_values carry the same tagged geometry shape a
 * POLYGON one does (key + display_name), so the same generic chip picker
 * covers both — see CreateDraftFactWizard.tsx's PlaceholderSlotField. */
const SUPPORTED_PLACEHOLDER_SLOT_KINDS = new Set(['POLYGON', 'LINE', 'LENGTH']);

/** A template is "supported" (shown in the wizard's top, selectable group)
 * when MapV2 knows how to render every slot it declares — every
 * PLACEHOLDER-bound slot's kind is one there's a picker for. Point slots
 * (ASKER_LOCATION/MAP_POINT) and TEMPLATE_CONSTANT slots are always fine. */
export function isTemplateSupported(template: GeoQuestionTemplate): boolean {
  const { operation_type, slot_bindings } = template.answer_instruction_meta;
  const contract = SUBOP_CONTRACT[operation_type];
  if (!contract) return false;
  return Object.entries(slot_bindings).every(([slotName, binding]) => {
    if (binding.source !== 'PLACEHOLDER') return true;
    const kind = contract.slots[slotName];
    return SUPPORTED_PLACEHOLDER_SLOT_KINDS.has(kind);
  });
}

/** Every slot name in a template bound to a device/pin point, in
 * declaration order — used both to render one point picker per slot and
 * to seed them from the Points & Distance tool's already-placed points. */
export function pointSlotNames(template: GeoQuestionTemplate): string[] {
  return Object.entries(template.answer_instruction_meta.slot_bindings)
    .filter(([, binding]) => binding.source === 'ASKER_LOCATION' || binding.source === 'MAP_POINT')
    .map(([slotName]) => slotName);
}

/** The first ASKER_LOCATION-bound slot, if any — the one slot the wizard
 * auto-resolves the moment a template is picked, since "device GPS,
 * automatically" is what that binding means. Any second ASKER_LOCATION
 * slot (Thermometer's pointFinal — a later, deliberately separate capture)
 * stays a manual "Use my location" tap like every MAP_POINT slot. */
export function firstAskerLocationSlot(template: GeoQuestionTemplate): string | null {
  const entry = Object.entries(template.answer_instruction_meta.slot_bindings).find(([, binding]) => binding.source === 'ASKER_LOCATION');
  return entry ? entry[0] : null;
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A short, friendly label for a point slot's picker — the MAP_POINT
 * binding's label_placeholder (e.g. "landmark_name" -> "Landmark Name")
 * when it has one, else the slot name itself (e.g. "pointFinal" -> "Point
 * Final"). */
export function pointSlotLabel(slotName: string, binding: SlotBinding): string {
  if (binding.source === 'MAP_POINT' && binding.label_placeholder) return humanize(binding.label_placeholder);
  return humanize(slotName);
}

export function buildAskedQuestion(
  template: GeoQuestionTemplate,
  points: PointValues,
  placeholders: PlaceholderValues,
  assumedValue: boolean,
  questionId: string,
): DraftAskedQuestion | null {
  const resolvedSlots = resolveTemplateSlots(template, points, placeholders);
  const assertedAnswer = resolveAssertedAnswer(template, placeholders);
  if (!resolvedSlots || !assertedAnswer) return null;

  const now = new Date().toISOString();
  return {
    question_id: questionId,
    question_template_id: questionTemplateId(template) ?? questionId,
    template: template.template,
    rendered_question: buildRenderedQuestion(template, points, placeholders),
    category: template.category,
    question_meta: {
      answer_instruction_type: template.answer_instruction_meta.operation_type,
      resolved_slots: resolvedSlots,
      asserted_answer: assertedAnswer,
      assumed_value: assumedValue,
    },
    answered: false,
    accepted: false,
    created: now,
    modified: now,
  };
}

export { ANSWER_WORD };
