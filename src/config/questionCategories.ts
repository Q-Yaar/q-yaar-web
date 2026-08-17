/**
 * Question Categories Configuration
 * 
 * MAIN MODULE - Public API for all category-related configuration.
 * 
 * This module re-exports everything from the split files and wires up
 * the handler assignments to the config registry.
 * 
 * SINGLE SOURCE OF TRUTH for all category-related configuration:
 * - Category to operation type mappings
 * - Category aliases
 * - Handler registrations
 * - Geo category detection
 * - Automation settings
 */

// ============================================================================
// ALL IMPORTS AT THE TOP
// ============================================================================

// TypeScript types
import type { Coord } from '../utils/geo';
import type { LocationPoint, FactMeta } from '../models/QuestionMeta';
import type { AskedQuestion } from '../models/QnA';

// Import types for use in function signatures
import type {
  GeoOperationType,
  LocationType,
  AskPhaseConfig,
  AnswerPhaseConfig,
  FactPhaseConfig,
  UIToolType,
  CategoryConfig,
  AutoAnswer,
  AutoAnswerResult,
  AutomationHandler,
  AutomationConfig,
} from './questionCategories.types';

// Import everything from config module
import * as Config from './questionCategories.config';

// Import handlers for backward compatibility (but they're no longer used for assignment)
import * as Handlers from './questionCategoryHandlers';

// Re-export types
export type {
  GeoOperationType,
  LocationType,
  AskPhaseConfig,
  AnswerPhaseConfig,
  FactPhaseConfig,
  UIToolType,
  CategoryConfig,
  AutoAnswer,
  AutoAnswerResult,
  AutomationContext,
  AutomationHandler,
  AutomationConfig,
} from './questionCategories.types';

// Re-export from config
export {
  DEFAULT_FACT_META,
  manualCategoryHandler,
  CATEGORY_REGISTRY,
  assignHandlers,
  getManualCategories,
  CATEGORY_TO_OPERATION,
  OPERATION_TO_CATEGORIES,
  GEO_CATEGORIES,
  CATEGORY_CONFIGS,
  CATEGORY_TO_HANDLER,
  CATEGORY_ALIASES,
  CATEGORY_TO_TOOL_TYPE,
  CATEGORY_TO_DISPLAY_LABEL,
} from './questionCategories.config';

// Re-export utility functions from handlers (for backward compatibility)
export {
  extractCoords,
  getCoordFromMeta,
  setAutomationDebug,
  debugLog,
} from './questionCategoryHandlers';

// Re-export debug functions from handlerFactory
export { setHandlerDebug, debugHandler } from './handlerFactory';

// ============================================================================
// HANDLER REGISTRATION
// ============================================================================

// Handlers are now created from handlerConfig in questionCategories.config.ts
// The assignHandlers call is no longer needed - handlers are created automatically
// from the handlerConfig field in each category definition.

// Call assignHandlers as a no-op for backward compatibility (it logs a message)
Config.assignHandlers({});

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
  return config?.fact || { factMetaDefaults: Config.DEFAULT_FACT_META, requiredFactMeta: [] };
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
  return factConfig?.factMetaDefaults || Config.DEFAULT_FACT_META;
}

/**
 * Get the full configuration for a category (resolves aliases).
 * Returns the category config or undefined if not found.
 */
export function getCategoryConfig(categoryName: string): CategoryConfig | undefined {
  return Handlers.getCategoryConfig(categoryName);
}

/**
 * Get the resolved category name (handles aliases).
 * Returns undefined if category is not found.
 */
export function getCanonicalCategory(categoryName: string | undefined): string | undefined {
  return Handlers.getCanonicalCategory(categoryName || '');
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Get the UI tool type for a category (resolves aliases).
 */
export function getToolTypeForCategory(categoryName: string): UIToolType | undefined {
  return Config.CATEGORY_TO_TOOL_TYPE[categoryName];
}

/**
 * Get the display label for a category (resolves aliases).
 */
export function getDisplayLabelForCategory(categoryName: string): string | undefined {
  return Config.CATEGORY_TO_DISPLAY_LABEL[categoryName];
}

/**
 * Get all category names including aliases that should be shown in UI dropdowns.
 * Returns a list of { value: category_name, label: display_label } pairs.
 */
export function getCategoryOptionsForUI(): Array<{ value: string; label: string }> {
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];
  
  for (const category of Config.CATEGORY_REGISTRY) {
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
// CATEGORY LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get all registered category names (including aliases)
 */
export function getAllCategoryNames(): string[] {
  return [
    ...Config.CATEGORY_REGISTRY.map(c => c.name),
    ...Config.CATEGORY_REGISTRY.flatMap(c => c.aliases || [])
  ];
}

/**
 * Get the operation type for a category.
 * Returns the operation type or undefined if the category is not mapped.
 */
export function getOperationType(categoryName: string | undefined): GeoOperationType | undefined {
  if (!categoryName) return undefined;
  return Config.CATEGORY_TO_OPERATION[categoryName];
}

/**
 * Check if a category requires geographic location data.
 */
export function isGeoCategory(categoryName: string | undefined): boolean {
  if (!categoryName) return false;
  return Config.GEO_CATEGORIES.has(categoryName);
}

/**
 * Get all category names that map to a specific operation type.
 */
export function getCategoriesForOperation(operation: GeoOperationType): string[] {
  return Config.OPERATION_TO_CATEGORIES[operation] || [];
}

/**
 * Resolve a category name to its effective operation type.
 * This handles aliases by returning the canonical operation type.
 */
export function resolveCategory(categoryName: string | undefined): GeoOperationType | undefined {
  if (!categoryName) return undefined;
  return Config.CATEGORY_TO_OPERATION[categoryName];
}

/**
 * Get the handler for a category (resolves aliases automatically)
 */
export function getHandlerForCategory(categoryName: string): AutomationHandler | undefined {
  return Handlers.getHandlerForCategory(categoryName);
}

/**
 * Check if a category exists in the registry
 */
export function isKnownCategory(categoryName: string): boolean {
  return categoryName in Config.CATEGORY_TO_OPERATION;
}

// ============================================================================
// AUTOMATION SERVICE FUNCTIONS
// ============================================================================

/**
 * Default automation configuration
 * Note: manualCategories is omitted here and derived from the registry
 */
const DEFAULT_AUTOMATION_CONFIG: Omit<AutomationConfig, 'manualCategories'> = {
  enabled: true,
  autoSubmitThreshold: 100,
  debug: true,
};

let automationConfig: AutomationConfig = {
  ...DEFAULT_AUTOMATION_CONFIG,
  manualCategories: Config.getManualCategories(),
};

/**
 * Check if a category should be handled manually
 */
function isManualCategory(categoryName: string): boolean {
  return automationConfig.manualCategories.has(categoryName);
}

/**
 * Initialize automation configuration
 */
export function initAutomationConfig(customConfig?: Partial<AutomationConfig>): void {
  // Get manual categories from registry
  const registryManualCats = Config.getManualCategories();
  
  // Extract manual categories from custom config (could be Set or array)
  const customManualCats = customConfig?.manualCategories;
  const manualCats: string[] = customManualCats 
    ? (customManualCats instanceof Set 
        ? Array.from(customManualCats) 
        : Array.isArray(customManualCats) 
          ? customManualCats 
          : [])
    : [];
  
  // Merge: start with registry-derived, add any custom ones
  const allManualCats = new Set(registryManualCats);
  for (const cat of manualCats) {
    allManualCats.add(cat);
  }
  
  // Build the final manual categories set
  const finalManualCats = customConfig?.manualCategories 
    ? new Set([...Array.from(allManualCats), ...(Array.from(customConfig.manualCategories))])
    : allManualCats;
  
  automationConfig = {
    ...DEFAULT_AUTOMATION_CONFIG,
    ...customConfig,
    manualCategories: finalManualCats,
  };
  
  // Update debug logging state
  Handlers.setAutomationDebug(automationConfig.debug);
}

/**
 * Get current automation configuration
 */
export function getAutomationConfig(): AutomationConfig {
  // Ensure manualCategories is populated from registry if empty
  if (automationConfig.manualCategories.size === 0) {
    automationConfig = {
      ...automationConfig,
      manualCategories: Config.getManualCategories(),
    };
  }
  return { ...automationConfig };
}

/**
 * Try to automatically compute an answer for a question
 * Returns the computed answer or null if automation is not possible
 * @param question - The question to answer
 * @param hiderLocation - Optional hider's current location for answer-time context
 */
export async function tryAutoAnswer(question: AskedQuestion, hiderLocation?: LocationPoint): Promise<AutoAnswer | null> {
  if (!automationConfig.enabled) {
    Handlers.debugLog('Automation is disabled');
    return null;
  }

  const categoryName = question.category.category_name;
  Handlers.debugLog(`Processing question: ${question.question_id}`, { category: categoryName });

  // Check if category is manual-only
  if (isManualCategory(categoryName)) {
    Handlers.debugLog(`Category "${categoryName}" is manual-only`);
    return null;
  }

  // Get handler for this category (automatically resolves aliases)
  const handler = getHandlerForCategory(categoryName);
  if (!handler) {
    Handlers.debugLog(`No handler registered for category: ${categoryName}`);
    return null;
  }

  // Try to compute answer (handler may be async)
  try {
    const answer = await handler({ question, hiderLocation });
    if (answer) {
      Handlers.debugLog(`Auto-answer computed for ${categoryName}`, answer);
      return answer;
    } else {
      Handlers.debugLog(`Handler for ${categoryName} returned null (missing data or not applicable)`);
      return null;
    }
  } catch (error) {
    Handlers.debugLog(`Error in handler for ${categoryName}: ${error}`);
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

      // For Area Operations: need polygon data and target location
      if (config.operation === 'Area Operations') {
        const hasPolygon = factMeta?.polygon_geo_json || meta.polygon_vertices;
        const locationCount = meta.location_points?.length || 0;
        if (!hasPolygon) {
          return {
            answer: null,
            reason: 'Area Operations questions require polygon vertex data',
            canAutoAnswer: false,
          };
        }
        if (locationCount < 1) {
          return {
            answer: null,
            reason: 'Area Operations questions require a target location to check',
            canAutoAnswer: false,
          };
        }
      }

      // For Matching: need feature name and answerer location
      if (config.operation === 'Matching') {
        const featureName = factMeta?.feature_name || meta.feature_name;
        if (!featureName) {
          return {
            answer: null,
            reason: 'Matching questions require a feature name to check against',
            canAutoAnswer: false,
          };
        }
        if (!hiderLocation) {
          return {
            answer: null,
            reason: 'Matching questions require answerer location (hider) to be provided separately',
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
