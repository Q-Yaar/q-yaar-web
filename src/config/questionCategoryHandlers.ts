/**
 * Question Category Handlers
 * 
 * Utility functions for handlers.
 * Individual handler implementations have been replaced with config-driven handlers.
 * See handlerFactory.ts for the new config-driven approach.
 */

import type { AskedQuestion } from '../models/QnA';
import type {
  AutomationContext,
  AutomationHandler,
  AutoAnswer,
  GeoOperationType,
} from './questionCategories.types';
import type { Coord } from '../utils/geoTypes';
import {
  CATEGORY_CONFIGS,
  CATEGORY_ALIASES,
  CATEGORY_TO_HANDLER,
  manualCategoryHandler,
} from './questionCategories.config';
import { parseCoord, parseLocationPoint } from './coordParsing';

// Coordinate parsing helpers live in a leaf module to avoid a circular import
// (see coordParsing.ts). Re-exported here to preserve the public API.
export { parseCoord, parseLocationPoint } from './coordParsing';

// ============================================================================
// COORDINATE PARSING
// ============================================================================

/**
 * Extract all coordinates from a question's metadata and rendered question
 * Supports both legacy field names (myLocation, hidingLocation) and new
 * explicit field names (seekerLocation, hiderLocation, targetLocation, etc.)
 */
export function extractAllCoordsFromQuestion(question: any): Coord[] {
  const coords: Coord[] = [];

  // Extract from rendered question text
  const textCoordPattern = /(-?\d+\.?\d+)\s*,\s*(-?\d+\.?\d+)/g;
  let match;
  const text = question.rendered_question || '';
  while ((match = textCoordPattern.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      coords.push({ lat, lon });
    }
  }

  const meta = question.question_meta || {};

  // Extract from question_meta.location_points
  if (meta.location_points) {
    for (const point of meta.location_points) {
      const parsed = parseLocationPoint(point);
      if (parsed) coords.push(parsed);
    }
  }

  // Extract from line_points (array of points)
  if (meta.line_points) {
    for (const point of meta.line_points) {
      const parsed = parseLocationPoint(point);
      if (parsed) coords.push(parsed);
    }
  }

  // Extract from polygon vertices
  if (meta.polygon_vertices) {
    for (const vertex of meta.polygon_vertices) {
      const parsed = parseCoord(vertex);
      if (parsed) coords.push(parsed);
    }
  }

  // Extract from named location fields - NEW explicit names
  const namedFields = [
    'seekerLocation',
    'hiderLocation',
    'targetLocation',
    'center',
    'previousLocation',
    'currentLocation',
  ] as const;

  for (const field of namedFields) {
    if (meta[field]) {
      const parsed = parseCoord(meta[field]);
      if (parsed) coords.push(parsed);
    }
  }

  // Extract from legacy field names (for backward compatibility)
  const legacyFields = ['myLocation', 'hidingLocation', 'target'] as const;
  for (const field of legacyFields) {
    if (meta[field]) {
      const parsed = parseCoord(meta[field]);
      if (parsed) coords.push(parsed);
    }
  }

  return coords;
}

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
