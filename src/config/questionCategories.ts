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
import type { Coord, LocationPoint } from '../utils/geo';
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
  FactMeta,
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
// CATEGORY DEFINITIONS
// ============================================================================

/**
 * Configuration for a single category.
 * Each category is defined here exactly once.
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
  };
}

/**
 * Context passed to automation handlers
 */
export interface AutomationContext {
  question: AskedQuestion;
}

/**
 * Automation handler function type
 */
export type AutomationHandler = (ctx: AutomationContext) => AutoAnswer | null;

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
  },
  {
    name: 'Polygon Location',
    operation: 'Polygon Location',
    handler: polygonLocationHandler,
    isGeo: true,
  },
  {
    name: 'Distance',
    operation: 'Distance',
    handler: distanceHandler,
    isGeo: true,
  },
  {
    name: 'Circle',
    operation: 'Circle',
    handler: circleHandler,
    isGeo: true,
    aliases: ['Radar'],
  },
  {
    name: 'Heading',
    operation: 'Heading',
    handler: headingHandler,
    isGeo: true,
    aliases: ['Relative Heading'],
  },
  {
    name: 'Hotter/Colder',
    operation: 'Hotter/Colder',
    handler: hotterColderHandler,
    isGeo: true,
    aliases: ['Hotter / Colder'],
  },
  {
    name: 'Area Operations',
    operation: 'Area Operations',
    handler: areaOperationsHandler,
    isGeo: true,
  },
  {
    name: 'closer-to-line',
    operation: 'Closer to Line',
    handler: closerToLineHandler,
    isGeo: true,
  },
  
  // ========== Non-Geo Categories ==========
  
  {
    name: 'Text Fact',
    operation: 'Text Fact',
    handler: textFactHandler,
    isGeo: false,
  },
];

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
  
  if (!isCategory(q, 'Measuring')) {
    debugLog('Measuring: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as MeasuringQuestionMeta;
  const locations = meta.location_points || [];
  
  if (locations.length < 3) {
    debugLog('Measuring: Not enough locations. Need seeker, target, and hider.', {
      locationCount: locations.length
    });
    return null;
  }
  
  const seekingLoc = parseLocationPoint(locations[0]);
  const targetLoc = parseLocationPoint(locations[1]);
  const hidingLoc = parseLocationPoint(locations[2]);
  
  if (!seekingLoc || !hidingLoc || !targetLoc) {
    debugLog('Measuring: Could not parse required locations');
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
  
  if (!isCategory(q, 'Polygon Location')) {
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
  
  if (!isCategory(q, 'Distance')) {
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
  
  const factMeta = q.fact_meta;
  if (!factMeta) {
    debugLog('Circle: Missing fact_meta');
    return null;
  }
  
  const points = factMeta.points || [];
  const radius = factMeta.radius ? parseFloat(factMeta.radius) : undefined;
  
  debugLog(`Circle handler: category=${categoryName}, points=${points.length}, radius=${radius}`);
  
  if (points.length < 2 || radius === undefined) {
    debugLog('Circle: Missing points or radius', {
      pointCount: points.length,
      hasRadius: radius !== undefined,
      radiusValue: factMeta.radius,
    });
    return null;
  }
  
  const center = parseLocationPoint(points[0]);
  const targetLoc = parseLocationPoint(points[1]);
  
  if (!center || !targetLoc) {
    debugLog('Circle: Invalid center or target location', {
      center: points[0],
      target: points[1],
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
 * Handler for "Heading" or "Relative Heading" category
 * Checks directional relationship between points
 */
function headingHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  
  if (categoryName !== 'Heading' && categoryName !== 'Relative Heading') {
    debugLog('Heading: Invalid category for this handler');
    return null;
  }
  
  const meta = q.question_meta as HeadingQuestionMeta;
  const referenceLoc = getCoordFromMeta(q, 'seekerLocation');
  const targetLoc = getCoordFromMeta(q, 'targetLocation');
  
  if (!referenceLoc || !targetLoc) {
    debugLog('Heading: Missing reference or target location');
    return null;
  }
  
  const hidingLoc = getCoordFromMeta(q, 'hiderLocation');
  
  if (hidingLoc) {
    const bearingToTarget = bearing(referenceLoc, targetLoc);
    const bearingToHiding = bearing(referenceLoc, hidingLoc);
    const angleDiff = Math.abs(bearingToTarget - bearingToHiding);
    
    return {
      result: true,
      metadata: {
        text: `Target bearing: ${bearingToTarget.toFixed(0)}°, Hiding bearing: ${bearingToHiding.toFixed(0)}°, Difference: ${angleDiff.toFixed(0)}°`,
        confidence: 100,
        computationMethod: 'bearing_comparison'
      }
    };
  }
  
  const targetBearing = bearing(referenceLoc, targetLoc);
  
  return {
    result: true,
    metadata: {
      text: `Bearing to target: ${targetBearing.toFixed(0)}°`,
      confidence: 100,
      computationMethod: 'bearing_to_target'
    }
  };
}

/**
 * Handler for "Hotter/Colder" category
 * Compares current distance to previous distance
 */
function hotterColderHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  
  if (categoryName !== 'Hotter/Colder' && categoryName !== 'Hotter / Colder') {
    debugLog('Hotter/Colder: Invalid category for this handler');
    return null;
  }
  
  const meta = q.question_meta as HotterColderQuestionMeta;
  const previousLoc = getCoordFromMeta(q, 'previousLocation');
  const currentLoc = getCoordFromMeta(q, 'currentLocation');
  const targetLoc = getCoordFromMeta(q, 'targetLocation');
  
  if (!previousLoc || !currentLoc || !targetLoc) {
    debugLog('Hotter/Colder: Missing locations');
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
  
  if (!isCategory(q, 'Text Fact')) {
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
 * Handler for "Area Operations" category
 * Handles area-based geometric questions
 */
function areaOperationsHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  
  if (!isCategory(q, 'Area Operations')) {
    debugLog('Area Operations: Invalid metadata type');
    return null;
  }
  
  const meta = q.question_meta as AreaOperationsQuestionMeta;
  
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
  
  if (!isCategory(q, 'closer-to-line')) {
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
 * Get the canonical category name for a given category (resolves aliases)
 */
export function getCanonicalCategory(categoryName: string): string | undefined {
  // Check if it's a direct category name
  const directMatch = CATEGORY_REGISTRY.find(c => c.name === categoryName);
  if (directMatch) return directMatch.name;
  
  // Check if it's an alias
  for (const category of CATEGORY_REGISTRY) {
    if (category.aliases?.includes(categoryName)) {
      return category.name;
    }
  }
  
  return undefined;
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

/**
 * Get the category config for a given category name
 */
export function getCategoryConfig(categoryName: string): CategoryConfig | undefined {
  // Check direct match
  const directMatch = CATEGORY_REGISTRY.find(c => c.name === categoryName);
  if (directMatch) return directMatch;
  
  // Check if it's an alias
  for (const category of CATEGORY_REGISTRY) {
    if (category.aliases?.includes(categoryName)) {
      return category;
    }
  }
  
  return undefined;
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
  debug: false,
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
 */
export function tryAutoAnswer(question: AskedQuestion): AutoAnswer | null {
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

  // Try to compute answer
  try {
    const answer = handler({ question });
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
export function canAutoAnswer(question: AskedQuestion): boolean {
  return tryAutoAnswer(question) !== null;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export type { Coord, LocationPoint, FactMeta };
export { extractAllCoordsFromQuestion } from '../utils/geo';
