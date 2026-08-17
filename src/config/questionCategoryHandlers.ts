/**
 * Question Category Handlers
 * 
 * Handler implementations for each category type.
 * Internal helper functions for handlers are also defined here.
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
import {
  MeasuringQuestionMeta,
  PolygonLocationQuestionMeta,
  DistanceQuestionMeta,
  HeadingQuestionMeta,
  AreaOperationsQuestionMeta,
  CloserToLineQuestionMeta,
  TextFactQuestionMeta,
} from '../models/QuestionMeta';
import type { AskedQuestion } from '../models/QnA';
import type {
  AutomationContext,
  AutomationHandler,
  AutoAnswer,
  GeoOperationType,
} from './questionCategories.types';
import {
  CATEGORY_CONFIGS,
  CATEGORY_ALIASES,
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
  if (canonical && CATEGORY_CONFIGS[canonical]) {
    return CATEGORY_CONFIGS[canonical].handler;
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
// HANDLER IMPLEMENTATIONS
// ============================================================================

/**
 * Handler for "Measuring" category
 * Handles questions like "Compared to me, are you closer to or further from [target]?"
 */
export function measuringHandler(ctx: AutomationContext): AutoAnswer | null {
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
export function polygonLocationHandler(ctx: AutomationContext): AutoAnswer | null {
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
export function distanceHandler(ctx: AutomationContext): AutoAnswer | null {
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
export function circleHandler(ctx: AutomationContext): AutoAnswer | null {
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
export function headingHandler(ctx: AutomationContext): AutoAnswer | null {
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
export function hotterColderHandler(ctx: AutomationContext): AutoAnswer | null {
  const q = ctx.question;
  const categoryName = q.category.category_name;
  const canonicalName = getCanonicalCategory(categoryName);
  
  if (canonicalName !== 'Hotter/Colder') {
    debugLog('Hotter/Colder: Invalid category for this handler');
    return null;
  }
  
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
export function textFactHandler(ctx: AutomationContext): AutoAnswer | null {
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
export async function areaOperationsHandler(ctx: AutomationContext): Promise<AutoAnswer | null> {
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
export function closerToLineHandler(ctx: AutomationContext): AutoAnswer | null {
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
// RE-EXPORTS from config for convenience
// ============================================================================

export {
  DEFAULT_FACT_META,
  GEO_CATEGORIES,
  CATEGORY_CONFIGS,
  CATEGORY_ALIASES,
} from './questionCategories.config';

export type { GeoOperationType };
