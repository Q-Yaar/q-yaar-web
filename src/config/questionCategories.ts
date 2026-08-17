/**
 * Question Categories Configuration
 * 
 * SINGLE SOURCE OF TRUTH for all category-related configuration:
 * - Category to operation type mappings
 * - Category aliases
 * - Handler registrations
 * - Geo category detection
 * - Automation settings
 */

import {
  parseCoord,
  parseLocationPoint,
  haversine,
  bearing,
  pointInPolygon,
  pointInCircle,
  extractAllCoordsFromQuestion
} from '../utils/geo';
import { getRelativeHeading } from '../utils/geoUtils';
import { getPolygonForFeature } from '../utils/featureUtils';
import type { Coord } from '../utils/geo';
import type { LocationPoint, FactMeta } from '../models/QuestionMeta';
import { AskedQuestion } from '../models/QnA';
import {
  MeasuringQuestionMeta,
  PolygonLocationQuestionMeta,
  DistanceQuestionMeta,
  CircleQuestionMeta,
  HeadingQuestionMeta,
  HotterColderQuestionMeta,
  AreaOperationsQuestionMeta,
  CloserToLineQuestionMeta,
  TextFactQuestionMeta,
  getLocationFromMeta,
  isCategory,
} from '../models/QuestionMeta';

// ============================================================================
// OPERATION TYPES
// ============================================================================

/**
 * Internal geo operation types that the system supports.
 * These are the canonical types used in automation handlers.
 */
export type GeoOperationType = 
  | 'Measuring'
  | 'Polygon Location'
  | 'Distance'
  | 'Circle'
  | 'Heading'
  | 'Hotter/Colder'
  | 'Area Operations'
  | 'Closer to Line'
  | 'Text Fact';

// ============================================================================
// PHASE TYPES
// ============================================================================

/**
 * Location types that can be required in different phases
 */
export type LocationType = 
  | 'seeker'
  | 'target'
  | 'hider'
  | 'center'
  | 'linePoints'
  | 'previousLocation'
  | 'currentLocation';

/**
 * Configuration for the ASK phase (when seeker asks a question)
 */
export interface AskPhaseConfig {
  /**
   * Which locations the seeker must provide when asking.
   * Note: hider location should NEVER be required here - seeker doesn't know it.
   */
  requiredLocations?: Partial<Record<LocationType, boolean>>;
  
  /**
   * Placeholder names that must be provided by the seeker.
   */
  requiredPlaceholders?: string[];
  
  /**
   * Maps template placeholder names to fact_meta fields.
   * e.g., { distance: 'radius' } means placeholder {{distance}} -> fact_meta.radius
   */
  placeholderMap?: Record<string, string>;
}

/**
 * Configuration for the ANSWER phase (when hider/answerer responds)
 */
export interface AnswerPhaseConfig {
  /**
   * Which locations the answerer must provide when answering.
   * Typically this includes hider/currentLocation.
   */
  requiredLocations?: Partial<Record<LocationType, boolean>>;
  
  /**
   * If true, automatically add the answerer's current location.
   * This is the typical case for geo questions.
   */
  autoAddAnswererLocation?: boolean;
  
  /**
   * Additional fact_meta fields that may be set during answering.
   */
  factMetaFields?: (keyof FactMeta)[];
}

/**
 * Configuration for the FACT phase (when creating reusable facts)
 */
export interface FactPhaseConfig {
  /**
   * Fact meta fields that are required for fact creation.
   */
  requiredFactMeta?: (keyof FactMeta)[];
  
  /**
   * Default values for fact_meta fields.
   * Ensures all required fields are present (backend requirement).
   */
  factMetaDefaults?: FactMeta;
}

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

/**
 * UI tool types that map to specific UI components
 */
export type UIToolType = 
  | 'text'
  | 'draw-circle'
  | 'polygon-location'
  | 'split-by-direction'
  | 'hotter-colder'
  | 'areas'
  | 'closer-to-line';

/**
 * Configuration for a single category.
 * Each category is defined here exactly once.
 * 
 * The configuration is now organized into three phases:
 * - ask: What the seeker provides when asking a question
 * - answer: What the answerer provides when responding
 * - fact: What's needed for fact creation/automation
 * - ui: UI-related configuration
 */
export interface CategoryConfig {
  /** The display name of the category */
  name: string;
  
  /** The operation type this category uses */
  operation: GeoOperationType;
  
  /** The handler function for this category */
  handler: AutomationHandler;
  
  /** Whether this is a geo category (requires location data) */
  isGeo: boolean;
  
  /** 
   * Aliases for this category.
   * Questions with these category names will be treated as this category.
   */
  aliases?: string[];
  
  /**
   * Configuration for the ASK phase (seeker asks question)
   */
  ask: AskPhaseConfig;
  
  /**
   * Configuration for the ANSWER phase (hider answers question)
   */
  answer: AnswerPhaseConfig;
  
  /**
   * Configuration for the FACT phase (fact creation)
   */
  fact: FactPhaseConfig;
  
  /**
   * UI-related configuration for this category
   */
  ui: {
    /** The UI tool type that should be used for this category */
    toolType: UIToolType;
    /** The display label for this category in UI dropdowns */
    displayLabel: string;
  };
}

/**
 * Result of an automation attempt
 */
export interface AutoAnswer {
  result: boolean | string;  // true/false for yes/no, or custom result strings
  metadata: {
    text?: string;
    confidence: number;  // 0-100
    computationMethod: string;
    split_direction?: string;  // Cardinal direction for heading questions
    details?: string;  // Additional details for validation (e.g., coordinates, heading)
  };
}

/**
 * Result of an automation attempt with reason information
 */
export interface AutoAnswerResult {
  answer: AutoAnswer | null;
  reason?: string;
  canAutoAnswer: boolean;
}

/**
 * Context passed to automation handlers
 */
export interface AutomationContext {
  question: AskedQuestion;
  hiderLocation?: LocationPoint;
}

/**
 * Automation handler function type
 * Can be sync or async to support operations that need to load data
 */
export type AutomationHandler = (ctx: AutomationContext) => AutoAnswer | null | Promise<AutoAnswer | null>;

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
 * All categories with their complete configuration.
 * Add new categories here and ONLY here.
 */
const CATEGORY_REGISTRY: CategoryConfig[] = [
  // ========== Geo Categories ==========
  
  {
    name: 'Measuring',
    operation: 'Measuring',
    handler: measuringHandler,
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
    name: 'Polygon Location',
    operation: 'Polygon Location',
    handler: polygonLocationHandler,
    isGeo: true,
    ask: {
      requiredLocations: { seeker: true, target: true },
      requiredPlaceholders: [],
      placeholderMap: {
        polygon_vertices: 'polygon_geo_json',
      },
    },
    answer: {
      autoAddAnswererLocation: true,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'polygon_geo_json'],
    },
    ui: {
      toolType: 'polygon-location',
      displayLabel: 'Polygon Location',
    },
  },
  {
    name: 'Distance',
    operation: 'Distance',
    handler: distanceHandler,
    isGeo: true,
    ask: {
      requiredLocations: { seeker: true, target: true },
      requiredPlaceholders: [],
      placeholderMap: {
        distance_threshold: 'radius',
      },
    },
    answer: {
      autoAddAnswererLocation: false,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'radius'],
    },
    ui: {
      toolType: 'draw-circle',
      displayLabel: 'Distance',
    },
  },
  {
    name: 'Circle',
    operation: 'Circle',
    handler: circleHandler,
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
    name: 'Heading',
    operation: 'Heading',
    handler: headingHandler,
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
  {
    name: 'Hotter/Colder',
    operation: 'Hotter/Colder',
    handler: hotterColderHandler,
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
    name: 'Area Operations',
    operation: 'Area Operations',
    handler: areaOperationsHandler,
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
    name: 'closer-to-line',
    operation: 'Closer to Line',
    handler: closerToLineHandler,
    isGeo: true,
    ask: {
      requiredLocations: { seeker: true, target: true, linePoints: true },
      requiredPlaceholders: [],
      placeholderMap: {
        selectedLineIndex: 'selected_line_index',
        closerFurther: 'closer_further',
      },
    },
    answer: {
      autoAddAnswererLocation: false,
    },
    fact: {
      factMetaDefaults: DEFAULT_FACT_META,
      requiredFactMeta: ['points', 'selected_line_index', 'closer_further'],
    },
    ui: {
      toolType: 'closer-to-line',
      displayLabel: 'Closer to Line',
    },
  },
  
  // ========== Non-Geo Categories ==========
  
  {
    name: 'Text Fact',
    operation: 'Text Fact',
    handler: textFactHandler,
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
];

// ============================================================================
// PHASE-BASED CONFIG ACCESSORS
// ============================================================================

/**
 * Get the ASK phase configuration for a category.
 */
export function getAskConfig(categoryName: string): AskPhaseConfig {
  const config = getCategoryConfig(categoryName);
  return config?.ask || { requiredLocations: {}, requiredPlaceholders: [], placeholderMap: {} };
}

/**
 * Get the ANSWER phase configuration for a category.
 */
export function getAnswerConfig(categoryName: string): AnswerPhaseConfig {
  const config = getCategoryConfig(categoryName);
  return config?.answer || { autoAddAnswererLocation: false, requiredLocations: {} };
}

/**
 * Get the FACT phase configuration for a category.
 */
export function getFactConfig(categoryName: string): FactPhaseConfig {
  const config = getCategoryConfig(categoryName);
  return config?.fact || { factMetaDefaults: DEFAULT_FACT_META, requiredFactMeta: [] };
}

/**
 * Get required locations for ASK phase from a category.
 * This is what the seeker must provide when asking.
 */
export function getAskRequiredLocations(categoryName: string): Partial<Record<LocationType, boolean>> {
  const askConfig = getAskConfig(categoryName);
  return askConfig?.requiredLocations || {};
}

/**
 * Get required locations for ANSWER phase from a category.
 * This is what the answerer must provide when answering.
 */
export function getAnswerRequiredLocations(categoryName: string): Partial<Record<LocationType, boolean>> {
  const answerConfig = getAnswerConfig(categoryName);
  return answerConfig?.requiredLocations || {};
}

/**
 * Check if answerer's location should be automatically added for a category.
 */
export function shouldAutoAddAnswererLocation(categoryName: string): boolean {
  const answerConfig = getAnswerConfig(categoryName);
  return answerConfig?.autoAddAnswererLocation === true;
}

/**
 * Get placeholder map for a category (for ASK phase).
 */
export function getPlaceholderMap(categoryName: string): Record<string, string> {
  const askConfig = getAskConfig(categoryName);
  return askConfig?.placeholderMap || {};
}

/**
 * Get required placeholders for ASK phase from a category.
 */
export function getAskRequiredPlaceholders(categoryName: string): string[] {
  const askConfig = getAskConfig(categoryName);
  return askConfig?.requiredPlaceholders || [];
}

/**
 * Get fact meta defaults for a category.
 */
export function getFactMetaDefaults(categoryName: string): FactMeta {
  const factConfig = getFactConfig(categoryName);
  return factConfig?.factMetaDefaults || DEFAULT_FACT_META;
}

// ============================================================================
// DERIVED CONFIGURATION (Computed from registry - don't edit directly)
// ============================================================================

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
 * Get the full configuration for a category (resolves aliases).
 * Returns the category config or undefined if not found.
 */
export function getCategoryConfig(categoryName: string): CategoryConfig | undefined {
  return CATEGORY_CONFIGS[categoryName];
}

/**
 * Get the resolved category name (handles aliases).
 * Returns undefined if category is not found.
 */
export function getCanonicalCategory(categoryName: string): string | undefined {
  const config = getCategoryConfig(categoryName);
  return config?.name;
}

/**
 * Maps category names (including aliases) to their handler.
 * Built from CATEGORY_REGISTRY.
 */
const CATEGORY_TO_HANDLER: Record<string, AutomationHandler> = 
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

/**
 * Get the UI tool type for a category (resolves aliases).
 */
export function getToolTypeForCategory(categoryName: string): UIToolType | undefined {
  return CATEGORY_TO_TOOL_TYPE[categoryName];
}

/**
 * Get the display label for a category (resolves aliases).
 */
export function getDisplayLabelForCategory(categoryName: string): string | undefined {
  return CATEGORY_TO_DISPLAY_LABEL[categoryName];
}

/**
 * Get all category names including aliases that should be shown in UI dropdowns.
 * Returns a list of { value: category_name, label: display_label } pairs.
 */
export function getCategoryOptionsForUI(): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];
  
  for (const category of CATEGORY_REGISTRY) {
    // Add the main category name
    if (!seen.has(category.name)) {
      options.push({ value: category.name, label: category.ui.displayLabel });
      seen.add(category.name);
    }
    
    // Add aliases
    if (category.aliases) {
      for (const alias of category.aliases) {
        if (!seen.has(alias)) {
          options.push({ value: alias, label: category.ui.displayLabel });
          seen.add(alias);
        }
      }
    }
  }
  
  return options;
}

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================


/**
 * Helper to extract coordinates from question metadata
 */
function extractCoords(question: AskedQuestion): Coord[] {
  return extractAllCoordsFromQuestion(question);
}

/**
 * Helper to get a specific coordinate by key from metadata
 */
function getCoordFromMeta(question: AskedQuestion, key: string): Coord | null {
  const meta = question.question_meta as any;
  const value = meta?.[key];
  if (!value) return null;
  return parseCoord(value);
}

/**
 * Debug logging function (can be enabled via automation config)
 */
let automationDebugEnabled = false;
export function setAutomationDebug(enabled: boolean): void {
  automationDebugEnabled = enabled;
}

function debugLog(message: string, data?: any): void {
  if (automationDebugEnabled) {
    console.log(`[QuestionAutomation] ${message}`, data || '');
  }
}

// --- Handler Implementations ---

/**
 * Handler for "Measuring" category
 * Handles questions like "Compared to me, are you closer to or further from [target]?"
 */
function measuringHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Measuring') {
    debugLog('Measuring: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as MeasuringQuestionMeta;
  const locations = meta.location_points || [];
  
  // Need at least seeker (index 0) and target (index 1) from question
  if (locations.length < 2) {
    debugLog('Measuring: Not enough locations. Need seeker and target.', {
      locationCount: locations.length
    });
    return null;
  }
  
  const seekingLoc = parseLocationPoint(locations[0]);
  const targetLoc = parseLocationPoint(locations[1]);
  
  // Hider location comes from answer-time context, not question metadata
  const hidingLoc = ctx.hiderLocation ? parseLocationPoint(ctx.hiderLocation) : null;
  
  if (!seekingLoc || !hidingLoc || !targetLoc) {
    debugLog('Measuring: Could not parse required locations', {
      hasSeeker: !!seekingLoc,
      hasHider: !!hidingLoc,
      hasTarget: !!targetLoc
    });
    return null;
  }
  
  const seekingToTarget = haversine(seekingLoc, targetLoc);
  const hidingToTarget = haversine(hidingLoc, targetLoc);
  
  const isCloser = hidingToTarget < seekingToTarget;
  
  return {
    result: isCloser,
    metadata: {
      text: `Hiding: ${hidingToTarget.toFixed(0)}m, Seeking: ${seekingToTarget.toFixed(0)}m to target`,
      confidence: 100,
      computationMethod: 'relative_distance_comparison'
    }
  };
}

/**
 * Handler for "Polygon Location" category
 * Checks if a point is inside a defined polygon
 */
function polygonLocationHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Polygon Location') {
    debugLog('Polygon Location: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as PolygonLocationQuestionMeta;
  const polygonVertices = meta.polygon_vertices;
  const targetLoc = getCoordFromMeta(q, 'targetLocation');
  
  if (!polygonVertices || !targetLoc) {
    debugLog('Polygon Location: Missing polygon vertices or target', {
      hasPolygon: !!polygonVertices,
      hasTarget: !!targetLoc
    });
    return null;
  }
  
  const polygon: Coord[] = [];
  for (const vertex of polygonVertices) {
    const coord = parseLocationPoint(vertex);
    if (coord) polygon.push(coord);
  }
  
  if (polygon.length < 3) {
    debugLog('Polygon Location: Polygon has less than 3 vertices');
    return null;
  }
  
  const isInside = pointInPolygon(targetLoc, polygon);
  
  return {
    result: isInside,
    metadata: {
      text: isInside ? 'Point is inside polygon' : 'Point is outside polygon',
      confidence: 100,
      computationMethod: 'point_in_polygon'
    }
  };
}

/**
 * Handler for "Distance" category
 * Checks if distance between points meets a threshold
 */
function distanceHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Distance') {
    debugLog('Distance: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as DistanceQuestionMeta;
  const locationPoints = meta.location_points;
  const threshold = meta.distance_threshold;
  
  if (!locationPoints || locationPoints.length < 2) {
    debugLog('Distance: Need at least 2 location points');
    return null;
  }
  
  const point1 = parseLocationPoint(locationPoints[0]);
  const point2 = parseLocationPoint(locationPoints[1]);
  
  if (!point1 || !point2) {
    debugLog('Distance: Could not parse location points');
    return null;
  }
  
  const distance = haversine(point1, point2);
  
  if (threshold !== undefined) {
    const isWithin = distance <= threshold;
    return {
      result: isWithin,
      metadata: {
        text: `Distance: ${distance.toFixed(0)}m (threshold: ${threshold}m)`,
        confidence: 100,
        computationMethod: 'distance_threshold_check'
      }
    };
  }
  
  return {
    result: true,
    metadata: {
      text: `Distance: ${distance.toFixed(0)}m`,
      confidence: 100,
      computationMethod: 'distance_calculation'
    }
  };
}

/**
 * Handler for "Circle" category (also handles Radar via alias)
 * Checks if a point is inside a circle
 */
function circleHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Circle') {
    debugLog('Circle: Invalid category for this handler');
    return null;
  }
  
  const factMeta = q.fact_meta;
  if (!factMeta) {
    debugLog('Circle: Missing fact_meta');
    return null;
  }
  
  const points = factMeta.points || [];
  const radius = factMeta.radius ? parseFloat(factMeta.radius) : undefined;
  
  debugLog(`Circle handler: category=${categoryName}, points=${points.length}, radius=${radius}`);
  
  // Circle/Radar: requires 1 point (center) + radius + hiderLocation
  if (points.length < 1) {
    debugLog('Circle: Missing center point', {
      pointCount: points.length,
    });
    return null;
  }
  
  if (radius === undefined) {
    debugLog('Circle: Missing radius', {
      radiusValue: factMeta.radius,
    });
    return null;
  }
  
  if (!ctx.hiderLocation) {
    debugLog('Circle: Missing hiderLocation from context');
    return null;
  }
  
  const center = parseLocationPoint(points[0]);
  const targetLoc = parseLocationPoint(ctx.hiderLocation);
  
  if (!center || !targetLoc) {
    debugLog('Circle: Invalid center or hider location', {
      center: points[0],
      hiderLocation: ctx.hiderLocation,
    });
    return null;
  }
  
  const isInside = pointInCircle(targetLoc, center, radius);
  const distance = haversine(targetLoc, center);
  
  return {
    result: isInside,
    metadata: {
      text: `Distance from center: ${distance.toFixed(0)}m (radius: ${radius}m)`,
      confidence: 100,
      computationMethod: 'point_in_circle'
    }
  };
}

/**
 * Handler for Heading, Relative Heading, and Relative categories
 * For all three: calculates bearing from seeker to hider using split_direction
 */
function headingHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Heading') {
    debugLog('Heading: Invalid category for this handler');
    return null;
  }
  
  const meta = q.question_meta as HeadingQuestionMeta;
  const locations = meta.location_points || [];
  
  const referenceLoc = locations.length > 0 ? parseLocationPoint(locations[0]) : null;
  
  if (!referenceLoc) {
    debugLog('Heading: Missing reference location');
    return null;
  }
  
  // Hider location comes from answer-time context
  const hidingLoc = ctx.hiderLocation ? parseLocationPoint(ctx.hiderLocation) : null;
  
  if (!hidingLoc) {
    debugLog('Heading: Missing hider location');
    return null;
  }
  
  const splitDirection = q.fact_meta?.split_direction || '';
  
  // For Relative category: use getRelativeHeading which returns separate lat/lon directions
  // This allows for simultaneously being North AND East (northeast), etc.
  if (canonicalName === 'Heading' && categoryName === 'Relative' && splitDirection) {
    // Convert Coord {lat, lon} to [lon, lat] array format expected by getRelativeHeading
    const p1 = [referenceLoc.lon, referenceLoc.lat];
    const p2 = [hidingLoc.lon, hidingLoc.lat];
    const relativeHeading = getRelativeHeading(p1, p2);
    const normalizedPlaceholder = splitDirection.toLowerCase();
    
    // Check the appropriate axis based on placeholder
    let isMatch = false;
    if (normalizedPlaceholder === 'north' || normalizedPlaceholder === 'south') {
      isMatch = relativeHeading.lat.toLowerCase() === normalizedPlaceholder;
    } else if (normalizedPlaceholder === 'east' || normalizedPlaceholder === 'west') {
      isMatch = relativeHeading.lon.toLowerCase() === normalizedPlaceholder;
    }
    
    const validationDetails = `Seeker: (${referenceLoc.lat.toFixed(6)}, ${referenceLoc.lon.toFixed(6)}), ` +
                            `Hider: (${hidingLoc.lat.toFixed(6)}, ${hidingLoc.lon.toFixed(6)}), ` +
                            `Heading: ${relativeHeading.lat}/${relativeHeading.lon}`;
    
    return {
      result: isMatch,  // UI converts boolean to "Yes"/"No" for Result display
      metadata: {
        text: validationDetails,  // Displayed as Details in UI
        confidence: 100,
        computationMethod: 'relative_heading_comparison',
      }
    };
  }
  
  // For Heading/Relative Heading: use bearing-based cardinal direction (legacy behavior)
  const bearingToHider = bearing(referenceLoc, hidingLoc);
  
  // Map bearing to cardinal direction for answer
  const getCardinalDirection = (b: number): string => {
    const normalized = ((b + 360) % 360);
    if (normalized >= 315 || normalized < 45) return 'North';
    if (normalized >= 45 && normalized < 135) return 'East';
    if (normalized >= 135 && normalized < 225) return 'South';
    return 'West';
  };
  
  const direction = getCardinalDirection(bearingToHider);
  
  return {
    result: true,
    metadata: {
      text: `Hider is ${direction} of seeker (bearing: ${bearingToHider.toFixed(0)}°)`,
      confidence: 100,
      computationMethod: 'bearing_to_cardinal_direction',
      split_direction: direction,
    }
  };
}

/**
 * Handler for "Hotter/Colder" category (including Hotter / Colder alias)
 * Compares current distance to previous distance
 */
function hotterColderHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Hotter/Colder') {
    debugLog('Hotter/Colder: Invalid category for this handler');
    return null;
  }
  
  const meta = q.question_meta as HotterColderQuestionMeta;
  const previousLoc = getCoordFromMeta(q, 'previousLocation');
  const targetLoc = getCoordFromMeta(q, 'targetLocation');
  
  // Current location comes from answer-time context (hider's current location)
  const currentLoc = ctx.hiderLocation ? parseLocationPoint(ctx.hiderLocation) : null;
  
  if (!previousLoc || !currentLoc || !targetLoc) {
    debugLog('Hotter/Colder: Missing locations', {
      hasPrevious: !!previousLoc,
      hasCurrent: !!currentLoc,
      hasTarget: !!targetLoc
    });
    return null;
  }
  
  const previousDistance = haversine(previousLoc, targetLoc);
  const currentDistance = haversine(currentLoc, targetLoc);
  
  const isGettingCloser = currentDistance < previousDistance;
  const distanceChange = previousDistance - currentDistance;
  
  return {
    result: isGettingCloser,
    metadata: {
      text: `${isGettingCloser ? 'Hotter' : 'Colder'}: ${Math.abs(distanceChange).toFixed(0)}m ${isGettingCloser ? 'closer' : 'further'}`,
      confidence: 100,
      computationMethod: 'distance_comparison'
    }
  };
}

/**
 * Handler for "Text Fact" category
 * Handles simple factual questions that can be verified
 */
function textFactHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Text Fact') {
    debugLog('Text Fact: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as TextFactQuestionMeta;
  const rendered = q.rendered_question.toLowerCase();
  const expectedAnswer = meta.expected_answer;
  
  if (expectedAnswer !== undefined) {
    const normalizedAnswer = String(expectedAnswer).toLowerCase().trim();
    const isYes = normalizedAnswer === 'yes' || normalizedAnswer === 'true' || normalizedAnswer === '1';
    const isNo = normalizedAnswer === 'no' || normalizedAnswer === 'false' || normalizedAnswer === '0';
    
    if (isYes || isNo) {
      return {
        result: isYes,
        metadata: {
          text: `Answer: ${expectedAnswer}`,
          confidence: 100,
          computationMethod: 'expected_answer_match'
        }
      };
    }
  }
  
  if (rendered.includes('2 + 2') && rendered.includes('equal to 4')) {
    return {
      result: true,
      metadata: {
        text: '2 + 2 = 4 is true',
        confidence: 100,
        computationMethod: 'mathematical_fact'
      }
    };
  }
  
  debugLog('Text Fact: Could not determine answer from available data');
  return null;
}

/**
 * Handler for "Area Operations" category (including Matching alias)
 * Handles area-based geometric questions
 */
async function areaOperationsHandler(ctx: AutomationContext): Promise<AutoAnswer | null> {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Area Operations') {
    debugLog('Area Operations: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as AreaOperationsQuestionMeta;
  const factMeta = q.fact_meta;

  // For "Matching" alias category
  if (categoryName === 'Matching') {
    // Get the feature name from fact_meta (where placeholder values are mapped)
    const questionFeatureName = factMeta?.feature_name;
    console.log(`[Matching Handler] questionFeatureName: ${questionFeatureName}`);
    if (!questionFeatureName) {
      debugLog('Matching: No feature_name in fact_meta');
      return null;
    }
    
    // Get the answerer's (hider's) current location from context
    const answererCoord = ctx.hiderLocation ? parseLocationPoint(ctx.hiderLocation) : null;
    console.log(`[Matching Handler] answererCoord:`, answererCoord);
    if (!answererCoord) {
      debugLog('Matching: Could not parse answerer coordinates from hiderLocation');
      return null;
    }
    
    // Get the polygon for the question's feature_name
    const polygon = await getPolygonForFeature(questionFeatureName);
    console.log(`[Matching Handler] polygon result:`, polygon);
    if (!polygon || polygon.length < 3) {
      debugLog(`Matching: Could not load polygon for feature: ${questionFeatureName}`);
      return null;
    }
    
    // Check if answerer's point is inside the polygon
    const isMatch = pointInPolygon(answererCoord, polygon);
    console.log(`[Matching Handler] isMatch: ${isMatch}`);
    
    return {
      result: isMatch,
      metadata: {
        text: isMatch 
          ? `Yes, in ${questionFeatureName}`
          : `No, not in ${questionFeatureName}`,
        confidence: 100,
        computationMethod: 'polygon_containment'
      }
    };
  }
  
  // Check if we have polygon data
  if (meta.polygon_vertices) {
    const tempCtx = {
      ...ctx,
      question: {
        ...ctx.question,
        question_meta: {
          ...meta,
          polygon_vertices: meta.polygon_vertices,
          targetLocation: meta.targetLocation,
        },
        category: { ...ctx.question.category, category_name: 'Polygon Location' },
      },
    } as AutomationContext;
    return polygonLocationHandler(tempCtx);
  }
  
  // Check if we have circle data
  if (meta.center && meta.radius !== undefined) {
    const tempCtx = {
      ...ctx,
      question: {
        ...ctx.question,
        question_meta: {
          ...meta,
          center: meta.center,
          radius: meta.radius,
          targetLocation: meta.targetLocation,
        },
        category: { ...ctx.question.category, category_name: 'Circle' },
      },
    } as AutomationContext;
    return circleHandler(tempCtx);
  }
  
  debugLog('Area Operations: No recognizable pattern');
  return null;
}

/**
 * Handler for "Closer to Line" category
 * Checks if a point is closer to a line than another point
 */
function closerToLineHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Closer to Line') {
    debugLog('Closer to Line: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as CloserToLineQuestionMeta;
  
  const linePoints = meta.line_points || [];
  const linePoint1 = linePoints.length > 0 ? parseLocationPoint(linePoints[0]) : null;
  const linePoint2 = linePoints.length > 1 ? parseLocationPoint(linePoints[1]) : null;
  const targetLoc = getCoordFromMeta(q, 'targetLocation');
  const seekerLoc = getCoordFromMeta(q, 'seekerLocation');
  
  if (!linePoint1 || !linePoint2 || !targetLoc || !seekerLoc) {
    debugLog('Closer to Line: Missing required data', {
      hasLinePoint1: !!linePoint1,
      hasLinePoint2: !!linePoint2,
      hasTarget: !!targetLoc,
      hasSeeker: !!seekerLoc,
    });
    return null;
  }
  
  // Calculate distances from line for both points
  const distanceToLine = (point: Coord, lineStart: Coord, lineEnd: Coord): number => {
    const l2 = haversine(lineStart, lineEnd);
    if (l2 === 0) return haversine(point, lineStart);
    
    const t = ((point.lat - lineStart.lat) * (lineEnd.lat - lineStart.lat) + 
              (point.lon - lineStart.lon) * (lineEnd.lon - lineStart.lon)) / l2;
    
    const projection = t < 0 ? lineStart : t > 1 ? lineEnd : {
      lat: lineStart.lat + t * (lineEnd.lat - lineStart.lat),
      lon: lineStart.lon + t * (lineEnd.lon - lineStart.lon),
    };
    
    return haversine(point, projection);
  };
  
  const targetToLine = distanceToLine(targetLoc, linePoint1, linePoint2);
  const seekerToLine = distanceToLine(seekerLoc, linePoint1, linePoint2);
  
  const isCloser = seekerToLine < targetToLine;
  
  return {
    result: isCloser,
    metadata: {
      text: `Seeker to line: ${seekerToLine.toFixed(0)}m, Target to line: ${targetToLine.toFixed(0)}m`,
      confidence: 100,
      computationMethod: 'closer_to_line_comparison'
    }
  };
}

// ============================================================================
// CATEGORY LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get all registered category names (including aliases)
 */
export function getAllCategoryNames(): string[] {
  return [
    ...CATEGORY_REGISTRY.map(c => c.name),
    ...CATEGORY_REGISTRY.flatMap(c => c.aliases || [])
  ];
}

/**
 * Get the operation type for a category.
 * Returns the operation type or undefined if the category is not mapped.
 */
export function getOperationType(categoryName: string | undefined): GeoOperationType | undefined {
  if (!categoryName) return undefined;
  return CATEGORY_TO_OPERATION[categoryName];
}

/**
 * Check if a category requires geographic location data.
 */
export function isGeoCategory(categoryName: string | undefined): boolean {
  if (!categoryName) return false;
  return GEO_CATEGORIES.has(categoryName);
}

/**
 * Get all category names that map to a specific operation type.
 */
export function getCategoriesForOperation(operation: GeoOperationType): string[] {
  return OPERATION_TO_CATEGORIES[operation] || [];
}

/**
 * Resolve a category name to its effective operation type.
 * This handles aliases by returning the canonical operation type.
 */
export function resolveCategory(categoryName: string | undefined): GeoOperationType | undefined {
  if (!categoryName) return undefined;
  return CATEGORY_TO_OPERATION[categoryName];
}

/**
 * Get the handler for a category (resolves aliases automatically)
 */
export function getHandlerForCategory(categoryName: string): AutomationHandler | undefined {
  return CATEGORY_TO_HANDLER[categoryName];
}

/**
 * Check if a category exists in the registry
 */
export function isKnownCategory(categoryName: string): boolean {
  return categoryName in CATEGORY_TO_OPERATION;
}

// ============================================================================
// AUTOMATION SERVICE FUNCTIONS
// ============================================================================

/**
 * Configuration for the automation service
 */
export interface AutomationConfig {
  enabled: boolean;
  manualCategories: Set<string>;
  autoSubmitThreshold: number;
  debug: boolean;
}

/**
 * Default automation configuration
 */
const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  enabled: true,
  manualCategories: new Set([
    'Photo',
    'Video', 
    'Image',
    'Picture',
    'Capture',
    'Subjective',
    'Opinion'
  ]),
  autoSubmitThreshold: 100,
  debug: true,
};

let automationConfig: AutomationConfig = { ...DEFAULT_AUTOMATION_CONFIG };

/**
 * Initialize automation configuration
 */
export function initAutomationConfig(customConfig?: Partial<AutomationConfig>): void {
  // Extract manual categories from custom config (could be Set or array)
  const customManualCats = customConfig?.manualCategories;
  const manualCats: string[] = customManualCats 
    ? (customManualCats instanceof Set 
        ? Array.from(customManualCats) 
        : Array.isArray(customManualCats) 
          ? customManualCats 
          : [])
    : [];
  
  const defaultCats = Array.from(DEFAULT_AUTOMATION_CONFIG.manualCategories);
  
  automationConfig = {
    ...DEFAULT_AUTOMATION_CONFIG,
    ...customConfig,
    manualCategories: new Set([...defaultCats, ...manualCats]),
  };
  
  // Update debug logging state
  setAutomationDebug(automationConfig.debug);
}

/**
 * Get current automation configuration
 */
export function getAutomationConfig(): AutomationConfig {
  return { ...automationConfig };
}

/**
 * Check if a category should be handled manually
 */
function isManualCategory(categoryName: string): boolean {
  return automationConfig.manualCategories.has(categoryName);
}

/**
 * Try to automatically compute an answer for a question
 * Returns the computed answer or null if automation is not possible
 * @param question - The question to answer
 * @param hiderLocation - Optional hider's current location for answer-time context
 */
export async function tryAutoAnswer(question: AskedQuestion, hiderLocation?: LocationPoint): Promise<AutoAnswer | null> {
  if (!automationConfig.enabled) {
    debugLog('Automation is disabled');
    return null;
  }

  const categoryName = question.category.category_name;
  debugLog(`Processing question: ${question.question_id}`, { category: categoryName });

  // Check if category is manual-only
  if (isManualCategory(categoryName)) {
    debugLog(`Category "${categoryName}" is manual-only`);
    return null;
  }

  // Get handler for this category (automatically resolves aliases)
  const handler = getHandlerForCategory(categoryName);
  if (!handler) {
    debugLog(`No handler registered for category: ${categoryName}`);
    return null;
  }

  // Try to compute answer (handler may be async)
  try {
    const answer = await handler({ question, hiderLocation });
    if (answer) {
      debugLog(`Auto-answer computed for ${categoryName}`, answer);
      return answer;
    } else {
      debugLog(`Handler for ${categoryName} returned null (missing data or not applicable)`);
      return null;
    }
  } catch (error) {
    debugLog(`Error in handler for ${categoryName}: ${error}`);
    return null;
  }
}

/**
 * Check if a question can be auto-answered
 */
export async function canAutoAnswer(question: AskedQuestion): Promise<boolean> {
  return (await tryAutoAnswer(question)) !== null;
}

/**
 * Try to automatically compute an answer for a question with reason
 * Returns both the answer and the reason if it fails
 * @param question - The question to answer
 * @param hiderLocation - Optional hider's current location for answer-time context
 */
export async function tryAutoAnswerWithReason(question: AskedQuestion, hiderLocation?: LocationPoint): Promise<AutoAnswerResult> {
  const categoryName = question.category.category_name;
  console.log(`[tryAutoAnswerWithReason] Starting for question ${question.question_id}, category: ${categoryName}`);
  
  if (!automationConfig.enabled) {
    console.log(`[tryAutoAnswerWithReason] Automation disabled`);
    return {
      answer: null,
      reason: 'Automation is disabled',
      canAutoAnswer: false,
    };
  }

  // Check if category is manual-only
  if (isManualCategory(categoryName)) {
    return {
      answer: null,
      reason: `Category "${categoryName}" is manual-only and cannot be auto-answered`,
      canAutoAnswer: false,
    };
  }

  // Get handler for this category (automatically resolves aliases)
  const handler = getHandlerForCategory(categoryName);
  if (!handler) {
    return {
      answer: null,
      reason: `No handler registered for category: ${categoryName}`,
      canAutoAnswer: false,
    };
  }

  // Try to compute answer (handler may be async)
  try {
    console.log(`[tryAutoAnswerWithReason] Calling handler for ${categoryName}`);
    const answer = await handler({ question, hiderLocation });
    if (answer) {
      console.log(`[tryAutoAnswerWithReason] Handler returned success for ${categoryName}:`, answer);
      return {
        answer,
        reason: undefined,
        canAutoAnswer: true,
      };
    } else {
      console.log(`[tryAutoAnswerWithReason] Handler returned null for ${categoryName}`);
      // Try to determine the reason from the handler
      // For now, return a generic reason; handlers can be updated to provide specific reasons
      const config = getCategoryConfig(categoryName);
      if (!config) {
        return {
          answer: null,
          reason: `Category "${categoryName}" is not a recognized auto-answerable category`,
          canAutoAnswer: false,
        };
      }

      // Check for common missing data patterns
      const meta = question.question_meta as any;
      const factMeta = question.fact_meta;

      // For Measuring: need 2 location points from question (seeker, target) + hiderLocation from context
      if (config.operation === 'Measuring') {
        const locationCount = meta.location_points?.length || 0;
        if (locationCount < 2) {
          return {
            answer: null,
            reason: `Measuring questions require seeker and target locations from question, but only ${locationCount} provided`,
            canAutoAnswer: false,
          };
        }
        if (!hiderLocation) {
          return {
            answer: null,
            reason: 'Measuring questions require hider location to be provided separately',
            canAutoAnswer: false,
          };
        }
      }

      // For Distance: need at least 2 location points and radius
      if (config.operation === 'Distance') {
        const locationCount = meta.location_points?.length || 0;
        const hasRadius = factMeta?.radius || meta.distance_threshold !== undefined;
        if (locationCount < 2) {
          return {
            answer: null,
            reason: `Distance questions require at least 2 location points, but only ${locationCount} provided`,
            canAutoAnswer: false,
          };
        }
        if (!hasRadius) {
          return {
            answer: null,
            reason: 'Distance questions require a radius/distance threshold value',
            canAutoAnswer: false,
          };
        }
      }

      // For Circle/Radar: need 1 point (center) + radius + hiderLocation
      if (config.operation === 'Circle') {
        const points = factMeta?.points || meta.location_points || [];
        const hasRadius = factMeta?.radius !== undefined;
        if (points.length < 1) {
          return {
            answer: null,
            reason: `Circle questions require at least 1 point (center), but only ${points.length} provided`,
            canAutoAnswer: false,
          };
        }
        if (!hasRadius) {
          return {
            answer: null,
            reason: 'Circle questions require a radius value',
            canAutoAnswer: false,
          };
        }
        if (!hiderLocation) {
          return {
            answer: null,
            reason: 'Circle questions require hider location to be provided separately',
            canAutoAnswer: false,
          };
        }
      }

      // For Heading/Relative Heading/Relative: need 1 location point from question (seeker) + hiderLocation from context
      if (config.operation === 'Heading') {
        const locationCount = meta.location_points?.length || 0;
        if (locationCount < 1) {
          return {
            answer: null,
            reason: `Heading questions require seeker location from question, but only ${locationCount} provided`,
            canAutoAnswer: false,
          };
        }
        if (!hiderLocation) {
          return {
            answer: null,
            reason: 'Heading questions require hider location to be provided separately',
            canAutoAnswer: false,
          };
        }
      }

      // For Hotter/Colder: need previous and target from question + current (hiderLocation) from context
      if (config.operation === 'Hotter/Colder') {
        const locationCount = meta.location_points?.length || 0;
        if (locationCount < 2) {
          return {
            answer: null,
            reason: `Hotter/Colder questions require previous and target locations from question, but only ${locationCount} provided`,
            canAutoAnswer: false,
          };
        }
        if (!hiderLocation) {
          return {
            answer: null,
            reason: 'Hotter/Colder questions require current location (hider) to be provided separately',
            canAutoAnswer: false,
          };
        }
      }

      // For Polygon Location: need polygon vertices and target
      if (config.operation === 'Polygon Location') {
        const hasPolygon = factMeta?.polygon_geo_json || meta.polygon_vertices;
        const locationCount = meta.location_points?.length || 0;
        if (!hasPolygon) {
          return {
            answer: null,
            reason: 'Polygon Location questions require polygon vertex data',
            canAutoAnswer: false,
          };
        }
        if (locationCount < 1) {
          return {
            answer: null,
            reason: 'Polygon Location questions require a target location to check',
            canAutoAnswer: false,
          };
        }
      }

      // For Area Operations / Matching: need feature name and answerer location
      if (config.operation === 'Area Operations') {
        const featureName = factMeta?.feature_name || meta.feature_name;
        if (!featureName) {
          return {
            answer: null,
            reason: 'Area Operations questions require a feature name to check against',
            canAutoAnswer: false,
          };
        }
        if (!hiderLocation) {
          return {
            answer: null,
            reason: 'Area Operations questions require answerer location (hider) to be provided separately',
            canAutoAnswer: false,
          };
        }
      }

      // For Closer to Line: need line points, seeker, and target locations
      if (config.operation === 'Closer to Line') {
        const linePoints = meta.line_points || [];
        const locationCount = meta.location_points?.length || 0;
        if (linePoints.length < 2) {
          return {
            answer: null,
            reason: `Closer to Line questions require at least 2 line points, but only ${linePoints.length} provided`,
            canAutoAnswer: false,
          };
        }
        if (locationCount < 2) {
          return {
            answer: null,
            reason: `Closer to Line questions require seeker and target locations, but only ${locationCount} provided`,
            canAutoAnswer: false,
          };
        }
      }

      // Generic reason if we couldn't determine a specific one
      const genericReason = `Handler for category "${categoryName}" could not compute an answer (missing or incomplete data)`;
      console.log(`[tryAutoAnswerWithReason] Returning generic failure: ${genericReason}`);
      return {
        answer: null,
        reason: genericReason,
        canAutoAnswer: false,
      };
    }
  } catch (error) {
    const errorReason = `Error computing auto-answer for category "${categoryName}": ${error}`;
    console.log(`[tryAutoAnswerWithReason] Error: ${errorReason}`);
    return {
      answer: null,
      reason: errorReason,
      canAutoAnswer: false,
    };
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export type { Coord, LocationPoint, FactMeta };
export { extractAllCoordsFromQuestion } from '../utils/geo';
