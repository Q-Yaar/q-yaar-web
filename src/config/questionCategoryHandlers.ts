/**
 * Question Category Handlers
 * 
 * Utility functions for handlers.
 * Individual handler implementations have been replaced with config-driven handlers.
 * See handlerFactory.ts for the new config-driven approach.
 */

import {
  parseCoord,
  parseLocationPoint,
  extractAllCoordsFromQuestion
} from '../utils/geo';
import type { AskedQuestion } from '../models/QnA';
import type {
  AutomationContext,
  AutomationHandler,
  AutoAnswer,
  GeoOperationType,
} from './questionCategories.types';
import type { Coord } from '../utils/geo';
import {
  CATEGORY_CONFIGS,
  CATEGORY_ALIASES,
  CATEGORY_TO_HANDLER,
  manualCategoryHandler,
} from './questionCategories.config';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to extract coordinates from question metadata
 */
export function extractCoords(question: AskedQuestion): Coord[] {
  return extractAllCoordsFromQuestion(question);
}

/**
 * Helper to get a specific coordinate by key from metadata
 */
export function getCoordFromMeta(question: AskedQuestion, key: string): Coord | null {
  const meta = question.question_meta as any;
  const value = meta?.[key];
  if (!value) return null;
  return parseCoord(value);
}

// ============================================================================
// DEBUGGING
// ============================================================================

/**
 * Debug logging state
 */
let automationDebugEnabled = false;

/**
 * Enable or disable automation debug logging
 */
export function setAutomationDebug(enabled: boolean): void {
  automationDebugEnabled = enabled;
}

/**
 * Debug logging function (can be enabled via automation config)
 */
export function debugLog(message: string, data?: any): void {
  if (automationDebugEnabled) {
    console.log(`[QuestionAutomation] ${message}`, data || '');
  }
}

// ============================================================================
// HANDLER LOOKUP
// ============================================================================

/**
 * Get the handler for a category (resolves aliases automatically)
 */
export function getHandlerForCategory(categoryName: string): AutomationHandler | undefined {
  const canonical = getCanonicalCategory(categoryName);
  if (canonical) {
    // Use CATEGORY_TO_HANDLER which is built from handlerConfigs
    return CATEGORY_TO_HANDLER[canonical];
  }
  return undefined;
}

/**
 * Get the full configuration for a category (resolves aliases).
 * Returns the category config or undefined if not found.
 */
export function getCategoryConfig(categoryName: string): any | undefined {
  const canonical = getCanonicalCategory(categoryName);
  if (canonical) {
    return CATEGORY_CONFIGS[canonical];
  }
  return CATEGORY_CONFIGS[categoryName];
}

/**
 * Get the resolved category name (handles aliases).
 * Returns undefined if category is not found.
 */
export function getCanonicalCategory(categoryName: string): string | undefined {
  if (CATEGORY_ALIASES[categoryName]) {
    return CATEGORY_ALIASES[categoryName];
  }
  // Check if it's already a canonical name
  for (const config of Object.values(CATEGORY_CONFIGS)) {
    if (config.name === categoryName) {
      return categoryName;
    }
  }
  return undefined;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export {
  DEFAULT_FACT_META,
  manualCategoryHandler,
  CATEGORY_REGISTRY,
  getManualCategories,
  CATEGORY_TO_OPERATION,
  OPERATION_TO_CATEGORIES,
  GEO_CATEGORIES,
  CATEGORY_CONFIGS,
  CATEGORY_ALIASES,
  CATEGORY_TO_HANDLER,
  CATEGORY_TO_TOOL_TYPE,
  CATEGORY_TO_DISPLAY_LABEL,
} from './questionCategories.config';

export type { GeoOperationType };
