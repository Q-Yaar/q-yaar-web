/**
 * ============================================================================
 * TEMPORARY FILE — mirrors legacyFactConverter.ts's role, one pipeline stage
 * earlier: converts a legacy QuestionTemplate (src/models/QnA.ts — what
 * GET /qna/categories/:id/questions/:id actually returns today) into the
 * QuestionTemplateDto "Ask to Fact" describes: op_type + slot_bindings +
 * asserted_answer, not just prose attached to a category. Delete this file
 * the moment the backend serves that shape directly.
 * ============================================================================
 *
 * The legacy backend has no per-slot notion of "where does this value come
 * from" — that knowledge lives in the FRONTEND's CATEGORY_REGISTRY
 * (src/config/questionCategories.config.ts): which locations the asker must
 * supply, which placeholder maps to which fact_meta field, which UI tool
 * renders it. This file re-expresses that same knowledge as slot_bindings,
 * one shape per legacy category name — deliberately mirroring what each
 * CategoryConfig entry's `ask` block already declares, the same way
 * legacyFactConverter.ts mirrors geoWorker.ts's applySingleOperation.
 *
 * Only the five categories with a genuine geo mechanism convert (Matching,
 * Measuring, Thermometer/"Hotter / Colder", Radar, Relative/"Relative
 * Heading"); everything else (Text Fact, Photo, ...) has no SUBOP_CONTRACT
 * equivalent and is skipped — same as legacyFactConverter.ts skips non-GEO
 * facts.
 */
import { QuestionTemplate } from '../../../models/QnA';
import { OP_TYPE, OpType } from './factTypes';
import { AssertedAnswerBinding, PlaceholderSpec, QuestionTemplateDto, SlotBinding } from './questionPipelineTypes';

/** Every placeholder key CATEGORY_REGISTRY's placeholderMap ever routes to
 * the given legacy fact_meta field, across every category that might use
 * it — a real template only ever declares one of these, so "whichever one
 * this template actually has" is how the slot finds its placeholder. */
const PLACEHOLDER_ALIASES: Record<string, string[]> = {
  polygon: ['region', 'feature_name', 'metro_line', 'gba_corporation'],
  radius: ['distance', 'radius'],
  direction: ['direction'],
  landmark: ['landmark_name'],
};

/** {{ token }} names appearing in the template prose, in order. The *list*
 * endpoint (GET .../questions/) never includes a `placeholders` block at
 * all — only the per-template *detail* endpoint does — so the prose itself
 * is the only reliable source of a placeholder's name for a template that
 * only ever arrived via the list. */
function tokensInProse(template: string): string[] {
  return Array.from(template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), (m) => m[1]);
}

function findPlaceholderKey(template: QuestionTemplate, aliasGroup: keyof typeof PLACEHOLDER_ALIASES): string | null {
  const declared = Object.keys(template.placeholders ?? {});
  const known = declared.length > 0 ? declared : tokensInProse(template.template);
  const alias = PLACEHOLDER_ALIASES[aliasGroup].find((name) => known.includes(name));
  // Matching/Radar/Relative templates only ever carry one placeholder in
  // practice — falling back to it covers a template using a key this list
  // hasn't seen yet, rather than silently dropping the slot's binding.
  return alias ?? known[0] ?? null;
}

interface TemplateShape {
  opType: OpType;
  slotBindings: (template: QuestionTemplate) => Record<string, SlotBinding>;
  assertedAnswer: (template: QuestionTemplate) => AssertedAnswerBinding;
}

const MEASURING_SHAPE: TemplateShape = {
  opType: OP_TYPE.POINT_POINT_BUFFER_INSIDE,
  // anchor = the target/landmark the asker names; point = the asker's own
  // live position — matches MEASURING_FACT_BUILDER's "center = target,
  // radius = distance(seeker, target)" reasoning in questionCategories.config.ts.
  // label_placeholder names which placeholder supplies the landmark's own
  // name (e.g. "landmark_name" in "...closer to {{ landmark_name }}?"),
  // same as the spec's own Measuring walkthrough.
  slotBindings: (template) => {
    const key = findPlaceholderKey(template, 'landmark');
    const anchor: SlotBinding = { source: 'MAP_POINT', bounds: 'GAME_AREA', ...(key ? { label_placeholder: key } : {}) };
    return {
      anchor,
      point: { source: 'ASKER_LOCATION' },
    };
  },
  assertedAnswer: () => ({ source: 'TEMPLATE_CONSTANT', value: 'INSIDE' }),
};

const THERMOMETER_SHAPE: TemplateShape = {
  opType: OP_TYPE.TWO_POINT_BISECTOR,
  // Both points are the asker's own device fix, just captured at two
  // different times (the initial ask, then a deferred "Add Current
  // Location") — see Thermometer's `ask.deferredLocations: 1`.
  slotBindings: () => ({
    point: { source: 'ASKER_LOCATION' },
    pointFinal: { source: 'ASKER_LOCATION' },
  }),
  assertedAnswer: () => ({ source: 'TEMPLATE_CONSTANT', value: 'HOTTER' }),
};

const LEGACY_CATEGORY_SHAPES: Record<string, TemplateShape> = {
  Matching: {
    opType: OP_TYPE.POLYGON_INSIDE,
    slotBindings: (template) => {
      const key = findPlaceholderKey(template, 'polygon');
      const bindings: Record<string, SlotBinding> = {};
      if (key) bindings.polygon = { source: 'PLACEHOLDER', placeholder: key };
      return bindings;
    },
    assertedAnswer: () => ({ source: 'TEMPLATE_CONSTANT', value: 'INSIDE' }),
  },
  Measuring: MEASURING_SHAPE,
  Thermometer: THERMOMETER_SHAPE,
  'Hotter / Colder': THERMOMETER_SHAPE,
  Radar: {
    opType: OP_TYPE.POINT_BUFFER_INSIDE,
    slotBindings: (template) => {
      const key = findPlaceholderKey(template, 'radius');
      const bindings: Record<string, SlotBinding> = { point: { source: 'ASKER_LOCATION' } };
      if (key) bindings.radius = { source: 'PLACEHOLDER', placeholder: key };
      return bindings;
    },
    assertedAnswer: () => ({ source: 'TEMPLATE_CONSTANT', value: 'INSIDE' }),
  },
  Relative: {
    opType: OP_TYPE.POINT_SPLIT,
    slotBindings: () => ({ point: { source: 'ASKER_LOCATION' } }),
    // The direction is asker-chosen, not author-fixed — POINT_SPLIT's
    // asserted pole is whichever of N/S/E/W the asker's placeholder picks.
    assertedAnswer: (template) => {
      const key = findPlaceholderKey(template, 'direction');
      return key ? { source: 'PLACEHOLDER', placeholder: key } : { source: 'TEMPLATE_CONSTANT', value: 'N' };
    },
  },
  'Relative Heading': {
    opType: OP_TYPE.POINT_SPLIT,
    slotBindings: () => ({ point: { source: 'ASKER_LOCATION' } }),
    assertedAnswer: (template) => {
      const key = findPlaceholderKey(template, 'direction');
      return key ? { source: 'PLACEHOLDER', placeholder: key } : { source: 'TEMPLATE_CONSTANT', value: 'N' };
    },
  },
};

function toPlaceholderSpec(spec: { required: boolean; allowed_values: string[] }): PlaceholderSpec {
  return {
    required: spec.required,
    // Legacy always sends an array (possibly empty); the new contract
    // omits allowed_values entirely to mean free text.
    allowed_values: spec.allowed_values && spec.allowed_values.length > 0 ? spec.allowed_values : undefined,
  };
}

/** Returns null for any category with no geo mechanism (Text Fact, Photo,
 * ...) — there is no SUBOP_CONTRACT op for those, so there is nothing to
 * convert them into. */
export function convertLegacyTemplate(template: QuestionTemplate): QuestionTemplateDto | null {
  const shape = LEGACY_CATEGORY_SHAPES[template.category.category_name];
  if (!shape) return null;

  const declaredPlaceholders = Object.entries(template.placeholders ?? {});
  const placeholders: Record<string, PlaceholderSpec> = {};
  if (declaredPlaceholders.length > 0) {
    for (const [key, spec] of declaredPlaceholders) {
      placeholders[key] = toPlaceholderSpec(spec);
    }
  } else {
    // No placeholders block (a list-endpoint response) — synthesize a
    // minimal entry per {{ token }} so slot_bindings still has a name to
    // point at. required:true is a guess (the real allow-list only exists
    // behind the detail endpoint), but every token seen in practice is one.
    for (const token of tokensInProse(template.template)) {
      placeholders[token] = { required: true };
    }
  }

  return {
    question_template_id: template.question_id,
    template: template.template,
    category: {
      category_id: template.category.category_id,
      category_name: template.category.category_name,
      priority: template.category.priority,
    },
    answer_instruction_type: shape.opType,
    slot_bindings: shape.slotBindings(template),
    asserted_answer: shape.assertedAnswer(template),
    placeholders,
    created: template.created,
    modified: template.modified,
  };
}

export function convertLegacyTemplates(templates: QuestionTemplate[]): QuestionTemplateDto[] {
  return templates
    .map(convertLegacyTemplate)
    .filter((t): t is QuestionTemplateDto => t !== null);
}
