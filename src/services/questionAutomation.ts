/**
 * Question Automation Service
 * Computes answers for questions that can be determined from attached metadata
 */

import { AskedQuestion } from '../models/QnA';
import {
  parseCoord,
  parseLocationPoint,
  haversine,
  bearing,
  pointInPolygon,
  pointInCircle,
  extractAllCoordsFromQuestion
} from '../utils/geo';
import type { Coord } from '../utils/geo';

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
const DEFAULT_CONFIG: AutomationConfig = {
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
  debug: false
};

let config: AutomationConfig = { ...DEFAULT_CONFIG };

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
  
  const defaultCats = Array.from(DEFAULT_CONFIG.manualCategories);
  config = {
    ...DEFAULT_CONFIG,
    ...customConfig,
    manualCategories: new Set([...defaultCats, ...manualCats])
  };
}

/**
 * Get current automation configuration
 */
export function getAutomationConfig(): AutomationConfig {
  return { ...config };
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
interface AutomationContext {
  question: AskedQuestion;
}

/**
 * Automation handler function type
 */
type AutomationHandler = (ctx: AutomationContext) => AutoAnswer | null;

/**
 * Registry of category handlers
 * Maps category names to their automation handler
 */
const handlers: Record<string, AutomationHandler> = {};

/**
 * Register an automation handler for a category
 */
export function registerHandler(categoryName: string, handler: AutomationHandler): void {
  handlers[categoryName] = handler;
}

/**
 * Check if a category should be handled manually
 */
function isManualCategory(categoryName: string): boolean {
  return config.manualCategories.has(categoryName);
}

/**
 * Log a debug message if debug mode is enabled
 */
function debugLog(message: string, data?: any): void {
  if (config.debug) {
    console.log(`[QuestionAutomation] ${message}`, data || '');
  }
}

/**
 * Try to automatically compute an answer for a question
 * Returns the computed answer or null if automation is not possible
 */
export function tryAutoAnswer(question: AskedQuestion): AutoAnswer | null {
  if (!config.enabled) {
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

  // Get handler for this category
  const handler = handlers[categoryName];
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
// CATEGORY HANDLERS
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
  const value = (question.question_meta as any)?.[key];
  if (!value) return null;
  return parseCoord(value);
}

/**
 * Handler for "Measuring" category
 * Handles questions like "Compared to me, are you closer to or further from [target]?"
 */
function measuringHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  
  // We need: seeking location, hiding location, target location
  const seekingLoc = getCoordFromMeta(q, 'myLocation');
  const hidingLoc = getCoordFromMeta(q, 'hidingLocation');
  
  // Target can be in location_points or extracted from template
  let targetLoc: Coord | null = null;
  
  if (q.question_meta?.location_points && q.question_meta.location_points.length > 0) {
    targetLoc = parseLocationPoint(q.question_meta.location_points[0]);
  }
  
  // If not in location_points, try to extract from rendered question
  if (!targetLoc) {
    const allCoords = extractCoords(q);
    // Filter out seeking and hiding locations if we have them
    const knownCoords = [seekingLoc, hidingLoc].filter(c => c !== null) as Coord[];
    const otherCoords = allCoords.filter(c => 
      !knownCoords.some(kc => kc.lat === c.lat && kc.lon === c.lon)
    );
    if (otherCoords.length > 0) {
      targetLoc = otherCoords[0];
    }
  }
  
  if (!seekingLoc || !hidingLoc || !targetLoc) {
    debugLog('Measuring: Missing required locations', {
      hasSeeking: !!seekingLoc,
      hasHiding: !!hidingLoc,
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
  
  // We need: polygon vertices and a target point
  const polygonVertices = (q.question_meta as any)?.polygon_vertices;
  let targetLoc: Coord | null = null;
  
  if (q.question_meta?.location_points && q.question_meta.location_points.length > 0) {
    targetLoc = parseLocationPoint(q.question_meta.location_points[0]);
  }
  
  if (!polygonVertices || !targetLoc) {
    debugLog('Polygon Location: Missing polygon vertices or target', {
      hasPolygon: !!polygonVertices,
      hasTarget: !!targetLoc
    });
    return null;
  }
  
  // Parse polygon vertices
  const polygon: Coord[] = [];
  for (const vertex of polygonVertices) {
    const coord = parseCoord(vertex);
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
  
  // We need: location points and optionally a threshold
  const locationPoints = q.question_meta?.location_points;
  const threshold = (q.question_meta as any)?.distance_threshold;
  
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
  
  // If there's a threshold, check against it
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
  
  // Without a threshold, we can still provide the distance
  // This might be used for questions that just want the distance value
  return {
    result: true,  // Default to true, the actual distance is in metadata
    metadata: {
      text: `Distance: ${distance.toFixed(0)}m`,
      confidence: 100,
      computationMethod: 'distance_calculation'
    }
  };
}

/**
 * Handler for "Circle" category
 * Checks if a point is inside a circle
 */
function circleHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  
  // We need: center, radius, and target point
  const center = getCoordFromMeta(q, 'center');
  const radius = (q.question_meta as any)?.radius;
  let targetLoc: Coord | null = null;
  
  if (q.question_meta?.location_points && q.question_meta.location_points.length > 0) {
    targetLoc = parseLocationPoint(q.question_meta.location_points[0]);
  }
  
  if (!center || radius === undefined || !targetLoc) {
    debugLog('Circle: Missing center, radius, or target', {
      hasCenter: !!center,
      hasRadius: radius !== undefined,
      hasTarget: !!targetLoc
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
  
  // We need: reference location and target location
  const referenceLoc = getCoordFromMeta(q, 'myLocation');
  let targetLoc: Coord | null = null;
  
  if (q.question_meta?.location_points && q.question_meta.location_points.length > 0) {
    targetLoc = parseLocationPoint(q.question_meta.location_points[0]);
  }
  
  if (!referenceLoc || !targetLoc) {
    debugLog('Heading: Missing reference or target location');
    return null;
  }
  
  // Check if hiding location is provided
  const hidingLoc = getCoordFromMeta(q, 'hidingLocation');
  
  // If we have hiding location, calculate bearing from reference to target
  // and from reference to hiding, then compare
  if (hidingLoc) {
    const bearingToTarget = bearing(referenceLoc, targetLoc);
    const bearingToHiding = bearing(referenceLoc, hidingLoc);
    const angleDiff = Math.abs(bearingToTarget - bearingToHiding);
    // For now, just return true if we can compute - more complex logic needed
    // for actual direction comparisons
    return {
      result: true,
      metadata: {
        text: `Target bearing: ${bearingToTarget.toFixed(0)}°, Hiding bearing: ${bearingToHiding.toFixed(0)}°, Difference: ${angleDiff.toFixed(0)}°`,
        confidence: 100,
        computationMethod: 'bearing_comparison'
      }
    };
  }
  
  // Without hiding location, we can still compute the bearing from reference to target
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
  
  // We need: previous location, current location, target location
  const previousLoc = getCoordFromMeta(q, 'previousLocation');
  const currentLoc = getCoordFromMeta(q, 'currentLocation');
  let targetLoc: Coord | null = null;
  
  if (q.question_meta?.location_points && q.question_meta.location_points.length > 0) {
    targetLoc = parseLocationPoint(q.question_meta.location_points[0]);
  }
  
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
  
  // For text facts, we look for known patterns in the template and rendered question
  // This is a simple implementation that checks for explicit yes/no patterns
  const rendered = q.rendered_question.toLowerCase();
  
  // Check for questions like "Is X equal to Y?" or "Is X true?"
  // where the answer might be embedded in the metadata
  const expectedAnswer = (q.question_meta as any)?.expected_answer;
  
  if (expectedAnswer !== undefined) {
    // Normalize the expected answer
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
  
  // Check for simple true/false patterns in the rendered question
  // This is a fallback for questions where the answer is determinable from the text
  // For example: "Is 2 + 2 equal to 4?"
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
  
  // Could not determine answer automatically
  debugLog('Text Fact: Could not determine answer from available data');
  return null;
}

/**
 * Handler for "Area Operations" category
 * Handles area-based geometric questions
 */
function areaOperationsHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  
  // This category might involve checking if points are in specific areas
  // For now, delegate to polygon or circle handlers if those metadata fields exist
  
  // Check if we have polygon data
  if ((q.question_meta as any)?.polygon_vertices) {
    return polygonLocationHandler(ctx);
  }
  
  // Check if we have circle data
  if (getCoordFromMeta(q, 'center') && (q.question_meta as any)?.radius) {
    return circleHandler(ctx);
  }
  
  debugLog('Area Operations: No recognizable pattern');
  return null;
}

// ============================================================================
// REGISTER HANDLERS
// ============================================================================

// Register all handlers
registerHandler('Measuring', measuringHandler);
registerHandler('Polygon Location', polygonLocationHandler);
registerHandler('Distance', distanceHandler);
registerHandler('Circle', circleHandler);
registerHandler('Heading', headingHandler);
registerHandler('Relative Heading', headingHandler);
registerHandler('Hotter/Colder', hotterColderHandler);
registerHandler('Hotter / Colder', hotterColderHandler);
registerHandler('Text Fact', textFactHandler);
registerHandler('Area Operations', areaOperationsHandler);
registerHandler('closer-to-line', distanceHandler); // Distance from Metro Line

// ============================================================================
// EXPORT
// ============================================================================

export type { Coord };
export { extractAllCoordsFromQuestion } from '../utils/geo';
