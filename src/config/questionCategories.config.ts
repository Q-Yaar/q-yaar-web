/**
 * Question Categories Configuration
 * 
 * Configuration data, registry, and derived mappings.
 * This is the single source of truth for category definitions.
 * 
 * All handler logic is now config-driven via handlerConfig.
 */

import type { FactMeta } from '../models/QuestionMeta';
import type {
  GeoOperationType,
  CategoryConfig,
  UIToolType,
  AutomationHandler,
  AutomationContext,
  AutoAnswer,
  HandlerConfig,
  FactBuilderConfig,
} from './questionCategories.types';
import { createHandlerFromConfig } from './handlerFactory';

// ============================================================================
// DEFAULT FACT META
// ============================================================================

/**
 * Default values for FactMeta - all fields must be present for backend compatibility.
 */
export const DEFAULT_FACT_META: FactMeta = {
  points: [],
  radius: '',
  hider_location: '',
  split_direction: '',
  preferred_point: '',
  area_op_type: '',
  uploaded_area: '',
  text: '',
  closer_further: '',
  selected_line_index: 0,
  polygon_geo_json: {},
  feature_name: '',
};

// ============================================================================
// MANUAL CATEGORY HANDLER
// ============================================================================

/**
 * Handler for manual-only categories (returns null to indicate manual answering required)
 */
export const manualCategoryHandler: AutomationHandler = () => null;

// ============================================================================
// HANDLER CONFIG DEFINITIONS
// ============================================================================

// Handler config for Matching category (async - loads polygon data)
const MATCHING_HANDLER_CONFIG: HandlerConfig = {
  operation: 'feature_containment',
  async: true,
  inputs: [
    { name: 'point', extractor: { source: 'context', path: 'hiderLocation', type: 'coord' } },
    { name: 'featureName', extractor: { source: 'fact_meta', path: 'feature_name', type: 'string' } },
  ],
  output: {
    resultField: 'result',
    textTemplate: '{{result}} in {{featureName}}',
    computationMethod: 'polygon_containment',
  },
};

// Handler config for Measuring category
const MEASURING_HANDLER_CONFIG: HandlerConfig = {
  operation: 'distance_comparison',
  async: false,
  inputs: [
    { name: 'pointA', extractor: { source: 'question_meta', path: 'location_points[0]', type: 'coord' } },
    { name: 'pointB', extractor: { source: 'question_meta', path: 'location_points[1]', type: 'coord' } },
    { name: 'pointC', extractor: { source: 'context', path: 'hiderLocation', type: 'coord' } },
    { name: 'pointD', extractor: { source: 'question_meta', path: 'location_points[1]', type: 'coord' } },
  ],
  output: {
    resultField: 'isCloser',
    textTemplate: 'Hiding: {{distanceCD}}m, Seeking: {{distanceAB}}m to target',
    computationMethod: 'relative_distance_comparison',
  },
};

// Fact builder for Measuring category.
//
// "Compared to me, are you closer to / further from [target]?" The boundary
// between closer-than-seeker and further-than-seeker is a circle centered on
// the TARGET with radius = distance(seeker, target). The accepted answer
// (isCloser) selects which side to shade: true -> inside, false -> outside.
//
// The fact is stored as a draw-circle op (consumed by applySingleOperation in
// geoWorker), with the target as the center and the seeker<->target distance
// (km, as required by getCirclePolygon) as the radius.
const MEASURING_FACT_BUILDER: FactBuilderConfig = {
  opType: 'draw-circle',
  fields: {
    // Center = target (location_points[1]).
    points: { kind: 'points', extracts: [
      { source: 'question_meta', path: 'location_points[1]', type: 'coord' },
    ] },
    // Radius = distance(seeker, target) in kilometers.
    radius: {
      kind: 'distance_km',
      a: { source: 'question_meta', path: 'location_points[0]', type: 'coord' },
      b: { source: 'question_meta', path: 'location_points[1]', type: 'coord' },
    },
    // Shade inside if the hider is closer (accepted result true), else outside.
    hiderLocation: { kind: 'fromAcceptedResult', true: 'inside', false: 'outside' },
  },
};

// Fact builder for Matching category.
//
// "My nearest metro line is Green Line. Is your nearest metro line the same?"
// The answerer's nearest feature (e.g. "Green Line") is stored in fact_meta as
// feature_name, and the accepted answer (point-in-polygon result) tells whether
// the hider is inside that feature's polygon. The fact shades the feature's
// polygon: inside when the accepted answer is true, outside (difference) when
// false.
//
// Matching questions never persist the polygon to fact_meta (the auto-answer
// handler loads it async via getPolygonForFeature and discards it), so the
// factBuilder reuses that same lookup to populate the `areas` op's
// uploadedArea. The polygon is wrapped as a GeoJSON Polygon Feature, the shape
// applySingleOperation's `areas` branch expects.
const MATCHING_FACT_BUILDER: FactBuilderConfig = {
  opType: 'areas',
  fields: {
    // The feature polygon, loaded by name (reuses getPolygonForFeature).
    uploadedArea: {
      kind: 'featureArea',
      featureName: { source: 'fact_meta', path: 'feature_name', type: 'string' },
    },
    // Shade inside the feature if the hider is inside (accepted true), else
    // difference the feature out (outside).
    areaOpType: { kind: 'fromAcceptedResult', true: 'inside', false: 'outside' },
    // Provenance: which feature and (for FeatureCollection sources) which index.
    featureName: {
      kind: 'raw',
      extract: { source: 'fact_meta', path: 'feature_name', type: 'string' },
    },
    selectedLineIndex: {
      kind: 'raw',
      extract: { source: 'fact_meta', path: 'selected_line_index', type: 'number' },
    },
  },
};

// Handler config for Circle/Radar category
const CIRCLE_HANDLER_CONFIG: HandlerConfig = {
  operation: 'point_in_circle',
  async: false,
  inputs: [
    { name: 'point', extractor: { source: 'context', path: 'hiderLocation', type: 'coord' } },
    { name: 'center', extractor: { source: 'fact_meta', path: 'points[0]', type: 'coord' } },
    { name: 'radius', extractor: { source: 'fact_meta', path: 'radius', type: 'number' } },
  ],
  output: {
    resultField: 'isInside',
    textTemplate: 'Distance from center: {{distance}}m (radius: {{radius}}m)',
    computationMethod: 'point_in_circle',
  },
};

// Handler config for Heading/Relative categories
const HEADING_HANDLER_CONFIG: HandlerConfig = {
  operation: 'relative_heading',
  async: false,
  inputs: [
    { name: 'from', extractor: { source: 'question_meta', path: 'location_points[0]', type: 'coord' } },
    { name: 'to', extractor: { source: 'context', path: 'hiderLocation', type: 'coord' } },
    { name: 'splitDirection', extractor: { source: 'fact_meta', path: 'split_direction', type: 'string' } },
  ],
  output: {
    resultField: 'result',
    textTemplate: 'Seeker: ({{from.lat}}, {{from.lon}}), Hider: ({{to.lat}}, {{to.lon}}), Hider is {{heading.lat}} and {{heading.lon}} of seeker',
    computationMethod: 'relative_heading_comparison',
  },
};

// Handler config for Thermometer category (reuses hotter_colder operation with a
// different input mapping: previous/current come from the question's location_points
// and the target is the hider's auto-added location).
const THERMOMETER_HANDLER_CONFIG: HandlerConfig = {
  operation: 'hotter_colder',
  async: false,
  inputs: [
    { name: 'previousLoc', extractor: { source: 'question_meta', path: 'location_points[0]', type: 'coord' } },
    { name: 'currentLoc', extractor: { source: 'question_meta', path: 'location_points[1]', type: 'coord' } },
    { name: 'targetLoc', extractor: { source: 'context', path: 'hiderLocation', type: 'coord' } },
  ],
  output: {
    resultField: 'isGettingCloser',
    textTemplate: '{{isGettingCloser}}: {{distanceChange}}m',
    computationMethod: 'distance_comparison',
  },
};

// Fact builder for Thermometer category.
//
// "Am I getting closer to or further from the target?" The seeker moved from
// location_points[0] (previous) to location_points[1] (current); the hider is
// the target (a live answer-time context input, not persisted). The accepted
// answer (isGettingCloser) tells which side of the previous<->current
// perpendicular bisector the hider lies on, so the fact is stored as a
// hotter-colder op over those two points with preferredPoint derived from the
// answer. applySingleOperation differences out the OTHER point's Voronoi cell,
// so preferredPoint = the point the hider is closer to (the kept half):
// isGettingCloser true  -> hider closer to current (p2)
// isGettingCloser false -> hider closer to previous (p1)
const THERMOMETER_FACT_BUILDER: FactBuilderConfig = {
  opType: 'hotter-colder',
  fields: {
    points: { kind: 'points', extracts: [
      { source: 'question_meta', path: 'location_points[0]', type: 'coord' },
      { source: 'question_meta', path: 'location_points[1]', type: 'coord' },
    ] },
    preferredPoint: { kind: 'fromAcceptedResult', true: 'p2', false: 'p1' },
  },
};

// Handler config for Text Fact category
const TEXT_FACT_HANDLER_CONFIG: HandlerConfig = {
  operation: 'text_match',
  async: false,
  inputs: [
    { name: 'expected', extractor: { source: 'question_meta', path: 'expected_answer', type: 'string' } },
    { name: 'text', extractor: { source: 'fact_meta', path: 'text', type: 'string' } },
  ],
  output: {
    resultField: 'isMatch',
    textTemplate: 'Answer: {{expected}}',
    computationMethod: 'expected_answer_match',
  },
};

// ============================================================================
// CATEGORY REGISTRY (Single Source of Truth)
// ============================================================================

/**
 * All categories with their complete configuration.
 * Add new categories here and ONLY here.
 * 
 * Handler functions are now created from handlerConfig using createHandlerFromConfig.
 * The handler field is populated automatically in the CATEGORY_TO_HANDLER mapping.
 */
export const CATEGORY_REGISTRY: CategoryConfig[] = [
  // ========== Geo Categories ==========
  
  {
    name: 'Matching',
    operation: 'Matching',
    handlerConfig: MATCHING_HANDLER_CONFIG,
    factBuilder: MATCHING_FACT_BUILDER,
    isGeo: true,
    aliases: [],
    ask: {
      requiredLocations: { seeker: true },
      requiredPlaceholders: [],
      placeholderMap: {
        feature_name: 'feature_name',
        metro_line: 'feature_name',
        gba_corporation: 'feature_name',
      },
    },
    answer: {
      autoAddAnswererLocation: true,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'feature_name'],
    },
    ui: {
      toolType: 'areas',
      displayLabel: 'Matching',
    },
  },
  {
    name: 'Measuring',
    operation: 'Measuring',
    handlerConfig: MEASURING_HANDLER_CONFIG,
    factBuilder: MEASURING_FACT_BUILDER,
    isGeo: true,
    ask: {
      requiredLocations: { seeker: true, target: true },
      // hider location is NOT required when asking - seeker doesn't know it
      requiredPlaceholders: [],
      placeholderMap: {},
    },
    answer: {
      requiredLocations: { hider: true },
      autoAddAnswererLocation: true,  // Answerer (hider) provides their location
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points'],  // All 3 locations (seeker, target, hider)
    },
    ui: {
      toolType: 'draw-circle',
      displayLabel: 'Distance Measurement',
    },
  },
  {
    name: 'Thermometer',
    operation: 'Hotter/Colder',
    handlerConfig: THERMOMETER_HANDLER_CONFIG,
    factBuilder: THERMOMETER_FACT_BUILDER,
    isGeo: true,
    aliases: ['Hotter / Colder'],
    ask: {
      requiredLocations: { seeker: true },
      deferredLocations: 1,
      requiredPlaceholders: [],
      placeholderMap: {},
    },
    answer: {
      autoAddAnswererLocation: true,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'closer_further'],
    },
    ui: {
      toolType: 'hotter-colder',
      displayLabel: 'Thermometer',
    },
  },
  {
    name: 'Radar',
    operation: 'Circle',
    handlerConfig: CIRCLE_HANDLER_CONFIG,
    isGeo: true,
    aliases: ['Radar'],
    ask: {
      requiredLocations: { seeker: true },
      requiredPlaceholders: ['distance'],
      placeholderMap: {
        distance: 'radius',
        radius: 'radius',
      },
    },
    answer: {
      requiredLocations: { hider: true },
      autoAddAnswererLocation: true,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'radius'],
    },
    ui: {
      toolType: 'draw-circle',
      displayLabel: 'Draw Circle',
    },
  },
  {
    name: 'Relative',
    operation: 'Heading',
    handlerConfig: HEADING_HANDLER_CONFIG,
    isGeo: true,
    aliases: ['Relative Heading', 'Relative'],
    ask: {
      requiredLocations: { seeker: true },
      requiredPlaceholders: ['direction'],
      placeholderMap: {
        direction: 'split_direction',
      },
    },
    answer: {
      requiredLocations: { hider: true },
      autoAddAnswererLocation: true,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'split_direction'],
    },
    ui: {
      toolType: 'split-by-direction',
      displayLabel: 'Relative Heading',
    },
  },
  
  // ========== Non-Geo Categories ==========
  
  {
    name: 'Text Fact',
    operation: 'Text Fact',
    handlerConfig: TEXT_FACT_HANDLER_CONFIG,
    isGeo: false,
    ask: {
      requiredLocations: {},
      requiredPlaceholders: [],
      placeholderMap: {
        expected_answer: 'text',
        fact_text: 'text',
      },
    },
    answer: {
      autoAddAnswererLocation: false,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['text'],
    },
    ui: {
      toolType: 'text',
      displayLabel: 'Text Fact',
    },
  },
  
  // ========== Manual Categories ==========
  
  {
    name: 'Photo',
    operation: 'Text Fact',
    handler: manualCategoryHandler,
    isGeo: false,
    ask: {
      requiredLocations: {},
      requiredPlaceholders: [],
      placeholderMap: {},
    },
    answer: {
      autoAddAnswererLocation: false,
      requiredLocations: {},
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: [],
    },
    ui: {
      toolType: 'text',
      displayLabel: 'Photo',
    },
  },
];

// ============================================================================
// DERIVED CONFIGURATION (Computed from registry - don't edit directly)
// ============================================================================

/**
 * Get all categories that should be handled manually (no automation handler).
 * A category is manual if it has no handler and no handlerConfig, or its handler is the manualCategoryHandler.
 */
export function getManualCategories(): Set<string> {
  const manual = new Set<string>();
  
  for (const category of CATEGORY_REGISTRY) {
    // Check if the category has no handlerConfig and (no handler or handler is manual)
    const hasValidHandler = category.handlerConfig || (category.handler && category.handler !== manualCategoryHandler);
    
    if (!hasValidHandler) {
      // Add the main category name
      manual.add(category.name);
      
      // Add aliases
      if (category.aliases) {
        for (const alias of category.aliases) {
          manual.add(alias);
        }
      }
    }
  }
  
  return manual;
}

/**
 * Maps category names to their operation type.
 * Built from CATEGORY_REGISTRY.
 */
export const CATEGORY_TO_OPERATION: Record<string, GeoOperationType> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    acc[category.name] = category.operation;
    // Also add aliases
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[alias] = category.operation;
      }
    }
    return acc;
  }, {} as Record<string, GeoOperationType>);

/**
 * Reverse mapping: operation type to category names that use it.
 * Built from CATEGORY_REGISTRY.
 */
export const OPERATION_TO_CATEGORIES: Record<GeoOperationType, string[]> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    if (!acc[category.operation]) {
      acc[category.operation] = [];
    }
    acc[category.operation].push(category.name);
    // Also add aliases
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[category.operation].push(alias);
      }
    }
    return acc;
  }, {} as Record<GeoOperationType, string[]>);

/**
 * Set of all categories that require geographic location data.
 * Built from CATEGORY_REGISTRY.
 */
export const GEO_CATEGORIES = new Set<string>(
  CATEGORY_REGISTRY
    .filter(c => c.isGeo)
    .flatMap(c => [c.name, ...(c.aliases || [])])
);

/**
 * Full registry mapping: category name (including aliases) -> CategoryConfig
 * Built from CATEGORY_REGISTRY.
 */
export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    acc[category.name] = category;
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[alias] = category;
      }
    }
    return acc;
  }, {} as Record<string, CategoryConfig>);

/**
 * Maps category names to their canonical name (resolves aliases).
 * Built from CATEGORY_REGISTRY.
 */
export const CATEGORY_ALIASES: Record<string, string> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[alias] = category.name;
      }
    }
    return acc;
  }, {} as Record<string, string>);

// ============================================================================
// HANDLER REGISTRATION
// ============================================================================

/**
 * Create and cache handlers from handlerConfigs
 * This ensures handlers are created only once per category
 */
const handlerCache = new Map<string, AutomationHandler>();

/**
 * Get or create a handler for a category from its handlerConfig
 */
function getHandlerForCategoryConfig(category: CategoryConfig): AutomationHandler {
  if (!category.handlerConfig) {
    // Fall back to explicit handler if no config
    if (category.handler) {
      return category.handler;
    }
    return manualCategoryHandler;
  }
  
  // Check cache
  if (handlerCache.has(category.name)) {
    return handlerCache.get(category.name)!;
  }
  
  // Create handler from config
  const handler = createHandlerFromConfig(category.handlerConfig);
  
  // Cache it
  handlerCache.set(category.name, handler);
  
  // Also cache by aliases
  if (category.aliases) {
    for (const alias of category.aliases) {
      handlerCache.set(alias, handler);
    }
  }
  
  return handler;
}

/**
 * Maps category names (including aliases) to their handler.
 * Built from CATEGORY_REGISTRY using handlerConfigs.
 */
export const CATEGORY_TO_HANDLER: Record<string, AutomationHandler> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    const handler = getHandlerForCategoryConfig(category);
    
    acc[category.name] = handler;
    // Also map aliases to the same handler
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[alias] = handler;
      }
    }
    return acc;
  }, {} as Record<string, AutomationHandler>);

// ============================================================================
// UI CONFIGURATION (Computed from registry)
// ============================================================================

/**
 * Maps category names (including aliases) to their UI tool type.
 * Built from CATEGORY_REGISTRY.
 */
export const CATEGORY_TO_TOOL_TYPE: Record<string, UIToolType> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    acc[category.name] = category.ui.toolType;
    // Also add aliases
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[alias] = category.ui.toolType;
      }
    }
    return acc;
  }, {} as Record<string, UIToolType>);

/**
 * Maps category names (including aliases) to their display label.
 * Built from CATEGORY_REGISTRY.
 */
export const CATEGORY_TO_DISPLAY_LABEL: Record<string, string> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    acc[category.name] = category.ui.displayLabel;
    // Also add aliases
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[alias] = category.ui.displayLabel;
      }
    }
    return acc;
  }, {} as Record<string, string>);

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/**
 * Legacy assignHandlers function - now a no-op since handlers are created from configs
 */
export function assignHandlers(_handlers: any): void {
  // No-op: handlers are now created from handlerConfig
  console.log('[assignHandlers] Handler assignment is now config-driven. This function is a no-op.');
}
