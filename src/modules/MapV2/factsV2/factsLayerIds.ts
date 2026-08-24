/**
 * Module ids for the two FactsLayerModule instances (confirmed / draft),
 * and the MapLibre layer ids FactsLayerModule derives from them
 * (`${id}-fill`). Shared between useFactsLayers.ts (which constructs the
 * modules) and useMapInteractions.ts (which hit-tests clicks against
 * their fill layers) so neither can drift from the other.
 */
export const FACTS_MODULE_ID = 'facts';
export const DRAFT_FACTS_MODULE_ID = 'draft-facts';
export const FACTS_FILL_LAYER = `${FACTS_MODULE_ID}-fill`;
export const DRAFT_FACTS_FILL_LAYER = `${DRAFT_FACTS_MODULE_ID}-fill`;
export const FACT_HIT_LAYERS = [FACTS_FILL_LAYER, DRAFT_FACTS_FILL_LAYER];

/** The wizard's own live "what would this look like" preview — a third
 * FactsLayerModule instance, not hit-testable (it's gone the moment the
 * wizard leaves the review step or closes, so nothing should try to click
 * it as if it were a real fact). */
export const WIZARD_PREVIEW_MODULE_ID = 'wizard-preview-fact';

/** Same idea as WIZARD_PREVIEW_MODULE_ID, for the Hider's Answer Questions
 * flow instead of the Ask a Question wizard — a fourth FactsLayerModule
 * instance, live only while a pending question is open in the answer
 * sheet. */
export const ANSWER_PREVIEW_MODULE_ID = 'answer-preview-fact';
