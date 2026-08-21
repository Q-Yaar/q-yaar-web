/**
 * Question Categories Types
 * 
 * Type definitions for question category configuration and automation.
 */

import type { Coord } from '../utils/geoTypes';
import type { LocationPoint, FactMeta } from '../models/QuestionMeta';
import type { AskedQuestion } from '../models/QnA';

// ============================================================================
// HANDLER CONFIG TYPES (moved from handlerFactory for circular dependency)
// ============================================================================

/**
 * Supported operation types (matching geoUtils.ts and geo.ts capabilities)
 */
export type ConfigurableOperation =
  | 'distance_comparison'
  | 'point_in_polygon'
  | 'point_in_circle'
  | 'distance_threshold'
  | 'text_match'
  | 'feature_containment'
  | 'polygon_containment'
  | 'relative_heading'
  | 'hotter_colder'
  | 'closer_to_line';

/**
 * How to extract a value from the question context
 */
export interface ValueExtractor {
  /** Source of the value: question_meta, fact_meta, or context */
  source: 'question_meta' | 'fact_meta' | 'context';
  /** Path to the value, e.g., 'location_points[0]', 'radius', 'hiderLocation' */
  path: string;
  /** Type of the value for conversion */
  type: 'coord' | 'coords' | 'number' | 'string' | 'boolean';
}

/**
 * Operation input definition
 */
export interface OperationInput {
  /** Name of the input variable */
  name: string;
  /** How to extract this value from the context */
  extractor: ValueExtractor;
}

/**
 * Output configuration for a handler
 */
export interface HandlerOutput {
  /** Which field from the operation result becomes the answer result */
  resultField: string;
  /** Optional text template with {{variable}} placeholders */
  textTemplate?: string;
  /** The computation method identifier */
  computationMethod: string;
}

/**
 * Config-driven handler definition
 */
export interface HandlerConfig {
  /** The operation type to execute */
  operation: ConfigurableOperation;
  /** Whether this operation is async (needs to await) */
  async: boolean;
  /** Inputs required for this operation */
  inputs: OperationInput[];
  /** Output configuration */
  output: HandlerOutput;
}

// ============================================================================
// FACT BUILDER CONFIG TYPES
// ============================================================================

/**
 * Describes how to derive a single op_meta field for a fact created from an
 * accepted question. Used by categories whose fact fields don't map 1:1 from
 * question fields (e.g. Measuring derives a radius from two points).
 *
 * Coordinates are extracted as { lat, lon } and emitted as [lng, lat] arrays
 * (the ordering used by op_meta / geoWorker).
 */
export type FactBuilderValue =
  /** A single coordinate -> [lng, lat] */
  | { kind: 'point'; extract: ValueExtractor }
  /** One or more coordinates -> [[lng, lat], ...] */
  | { kind: 'points'; extracts: ValueExtractor[] }
  /** Great-circle distance (km) between two extracted points -> number */
  | { kind: 'distance_km'; a: ValueExtractor; b: ValueExtractor }
  /** Map the accepted answer result (true/false) to a literal -> string */
  | { kind: 'fromAcceptedResult'; true: string; false: string }
  /** A literal value (passthrough, with empty-value filtering applied) */
  | { kind: 'literal'; value: unknown };

/**
 * Config-driven fact builder. Describes how to construct the geometry op_meta
 * for a fact created from an accepted question, for categories that need
 * derived fields. Categories without a factBuilder fall back to the generic
 * field-mapping path in createFactFromQuestion.
 */
export interface FactBuilderConfig {
  /** The op_type (UI tool type) for the created fact. */
  opType: UIToolType;
  /** op_meta fields consumed by applySingleOperation. */
  fields: Record<string, FactBuilderValue>;
}

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
  | 'Matching'
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

  /**
   * Locations expected to be added after the initial ask (e.g. via the
   * "Add Current Location" button). Total locations required to answer =
   * count(requiredLocations) + deferredLocations.
   */
  deferredLocations?: number;
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
  
  /** Config-driven handler definition for this category */
  handlerConfig?: HandlerConfig;

  /**
   * Config-driven fact builder for this category. When present,
   * createFactFromQuestion uses this to derive the fact's op_meta instead of
   * the generic field-mapping path. Used by categories whose fact fields are
   * derived from the accepted question (e.g. Measuring derives a radius).
   */
  factBuilder?: FactBuilderConfig;

  /** The handler function for this category (can be derived from handlerConfig) */
  handler?: AutomationHandler;
  
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

// ============================================================================
// AUTOMATION TYPES
// ============================================================================

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

/**
 * Configuration for the automation service
 */
export interface AutomationConfig {
  enabled: boolean;
  manualCategories: Set<string>;
  autoSubmitThreshold: number;
  debug: boolean;
}
