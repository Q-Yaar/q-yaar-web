/**
 * Question Categories Configuration
 * 
 * Configuration data, registry, and derived mappings.
 * This is the single source of truth for category definitions.
 */

import type { FactMeta } from '../models/QuestionMeta';
import type {
  GeoOperationType,
  CategoryConfig,
  UIToolType,
  AutomationHandler,
  AutomationContext,
  AutoAnswer,
} from './questionCategories.types';

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
// CATEGORY REGISTRY (Single Source of Truth)
// ============================================================================

/**
 * Forward declaration of handler functions (defined in questionCategoryHandlers.ts)
 * These are imported and assigned below to break circular dependencies
 */
export type HandlerFunctions = {
  measuringHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  polygonLocationHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  distanceHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  circleHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  headingHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  hotterColderHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  textFactHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  areaOperationsHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  closerToLineHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
  manualCategoryHandler: (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;
};

/**
 * Handler for manual-only categories (returns null to indicate manual answering required)
 */
export const manualCategoryHandler: AutomationHandler = () => null;

/**
 * All categories with their complete configuration.
 * Add new categories here and ONLY here.
 * 
 * NOTE: Handler functions must be assigned after importing from handlers module
 * to avoid circular dependencies. Use `assignHandlers()` function.
 */
export const CATEGORY_REGISTRY: CategoryConfig[] = [
  // ========== Geo Categories ==========
  
  {
    name: 'Matching',
    operation: 'Area Operations',
    handler: null as any,
    isGeo: true,
    aliases: ['Matching'],
    ask: {
      requiredLocations: { seeker: true, target: true },
      requiredPlaceholders: [],
      placeholderMap: {
        radius: 'radius',
        areaOpType: 'area_op_type',
        feature_name: 'feature_name',
        metro_line: 'feature_name',
      },
    },
    answer: {
      autoAddAnswererLocation: true,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'radius', 'area_op_type', 'feature_name', 'polygon_geo_json'],
    },
    ui: {
      toolType: 'areas',
      displayLabel: 'Area Operations',
    },
  },
  {
    name: 'Measuring',
    operation: 'Measuring',
    handler: null as any, // Assigned by assignHandlers()
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
    handler: null as any,
    isGeo: true,
    aliases: ['Hotter / Colder'],
    ask: {
      requiredLocations: { target: true },
      requiredPlaceholders: ['closerFurther'],
      placeholderMap: {
        closerFurther: 'closer_further',
      },
    },
    answer: {
      requiredLocations: { previousLocation: true, currentLocation: true },
      autoAddAnswererLocation: true,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'closer_further'],
    },
    ui: {
      toolType: 'hotter-colder',
      displayLabel: 'Hotter / Colder',
    },
  },
  {
    name: 'Radar',
    operation: 'Circle',
    handler: null as any,
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
    handler: null as any,
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
    handler: null as any,
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
// HANDLER ASSIGNMENT
// ============================================================================

/**
 * Assign handler functions to the registry.
 * This function should be called after importing handlers from the handlers module.
 */
export function assignHandlers(handlers: HandlerFunctions): void {
  for (const category of CATEGORY_REGISTRY) {
    if (category.handler === null) continue;
    
    switch (category.name) {
      case 'Measuring':
        category.handler = handlers.measuringHandler;
        break;
      case 'Polygon Location':
        category.handler = handlers.polygonLocationHandler;
        break;
      case 'Distance':
        category.handler = handlers.distanceHandler;
        break;
      case 'Circle':
        category.handler = handlers.circleHandler;
        break;
      case 'Heading':
        category.handler = handlers.headingHandler;
        break;
      case 'Hotter/Colder':
        category.handler = handlers.hotterColderHandler;
        break;
      case 'Text Fact':
        category.handler = handlers.textFactHandler;
        break;
      case 'Area Operations':
        category.handler = handlers.areaOperationsHandler;
        break;
      case 'closer-to-line':
        category.handler = handlers.closerToLineHandler;
        break;
    }
  }
}

// ============================================================================
// DERIVED CONFIGURATION (Computed from registry - don't edit directly)
// ============================================================================

/**
 * Get all categories that should be handled manually (no automation handler).
 * A category is manual if it has no handler or its handler is the manualCategoryHandler.
 */
export function getManualCategories(): Set<string> {
  const manual = new Set<string>();
  
  for (const category of CATEGORY_REGISTRY) {
    // Check if the handler is manualCategoryHandler or undefined/null
    if (!category.handler || category.handler === manualCategoryHandler) {
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
 * Maps category names (including aliases) to their handler.
 * Built from CATEGORY_REGISTRY.
 */
export const CATEGORY_TO_HANDLER: Record<string, AutomationHandler> = 
  CATEGORY_REGISTRY.reduce((acc, category) => {
    acc[category.name] = category.handler;
    // Also map aliases to the same handler
    if (category.aliases) {
      for (const alias of category.aliases) {
        acc[alias] = category.handler;
      }
    }
    return acc;
  }, {} as Record<string, AutomationHandler>);

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
