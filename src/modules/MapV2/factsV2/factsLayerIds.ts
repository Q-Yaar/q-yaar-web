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
