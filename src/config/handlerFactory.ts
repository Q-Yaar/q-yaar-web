/**
 * Handler Factory
 * 
 * Config-driven handler factory that creates automation handlers from configuration.
 * This replaces the individual handler functions with a single factory approach.
 */

import {
  parseCoord,
  haversine,
  bearing,
  pointInPolygon,
  pointInCircle,
} from '../utils/geo';
import { getRelativeHeading } from '../utils/geoUtils';
import { getPolygonForFeature } from '../utils/featureUtils';
import type { Coord } from '../utils/geo';
import type { 
  AutomationContext, 
  AutoAnswer, 
  AutomationHandler,
  HandlerConfig,
  ConfigurableOperation,
  ValueExtractor,
  OperationInput,
  HandlerOutput,
} from './questionCategories.types';

// ============================================================================
// RE-EXPORTS (for convenience)
// ============================================================================

export type {
  ConfigurableOperation,
  ValueExtractor,
  OperationInput,
  HandlerOutput,
  HandlerConfig,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a nested value from an object using a path string
 * Supports dot notation and array indexing: 'location_points[0].lat', 'fact_meta.radius'
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  
  // Handle array indexing syntax like 'location_points[0]'
  const arrayIndexPattern = /^(.+?)\[(\d+)\]$/;
  const match = path.match(arrayIndexPattern);
  
  if (match) {
    const propName = match[1];
    const index = parseInt(match[2]);
    const array = obj[propName];
    if (Array.isArray(array) && index >= 0 && index < array.length) {
      return array[index];
    }
    return undefined;
  }
  
  // Handle dot notation
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Convert a raw value to the specified type
 */
function convertValue(raw: any, type: 'coord' | 'coords' | 'number' | 'string' | 'boolean'): any {
  switch (type) {
    case 'coord':
      if (typeof raw === 'object' && raw !== null && 'lat' in raw && 'lon' in raw) {
        return { lat: Number(raw.lat), lon: Number(raw.lon) } as Coord;
      }
      if (typeof raw === 'string') {
        return parseCoord(raw);
      }
      return parseCoord(String(raw));
    
    case 'coords':
      if (Array.isArray(raw)) {
        return raw.map((r: any) => convertValue(r, 'coord')).filter((c: any) => c !== null);
      }
      return [];
    
    case 'number':
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') {
        const num = parseFloat(raw);
        return isNaN(num) ? 0 : num;
      }
      return Number(raw) || 0;
    
    case 'string':
      return String(raw || '');
    
    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'string') {
        return raw.toLowerCase() === 'true' || raw === '1';
      }
      return Boolean(raw);
    
    default:
      return raw;
  }
}

/**
 * Extract a value from the context using an extractor
 */
function extractValue(ctx: AutomationContext, extractor: ValueExtractor): any {
  let rawValue: any;
  
  switch (extractor.source) {
    case 'question_meta':
      rawValue = getNestedValue(ctx.question.question_meta, extractor.path);
      break;
    case 'fact_meta':
      rawValue = getNestedValue(ctx.question.fact_meta, extractor.path);
      break;
    case 'context':
      // Handle hiderLocation specially since it's in ctx.hiderLocation, not ctx.question
      if (extractor.path === 'hiderLocation') {
        rawValue = ctx.hiderLocation;
      } else {
        rawValue = getNestedValue(ctx, extractor.path);
      }
      break;
    default:
      return null;
  }
  
  if (rawValue === undefined || rawValue === null) {
    return null;
  }
  
  return convertValue(rawValue, extractor.type);
}

/**
 * Simple template rendering with {{variable}} syntax
 */
function renderTemplate(template: string, values: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = values[varName];
    return value !== undefined ? String(value) : match;
  });
}

// ============================================================================
// OPERATION EXECUTORS
// ============================================================================

/**
 * Execute distance comparison: compare distance from A->B vs C->D
 */
function executeDistanceComparison(inputs: Record<string, any>): Record<string, any> {
  const pointA = inputs.pointA as Coord;
  const pointB = inputs.pointB as Coord;
  const pointC = inputs.pointC as Coord;
  const pointD = inputs.pointD as Coord;
  
  if (!pointA || !pointB || !pointC || !pointD) {
    return { result: false, error: 'Missing points for distance comparison' };
  }
  
  const distanceAB = haversine(pointA, pointB);
  const distanceCD = haversine(pointC, pointD);
  
  return {
    result: distanceCD < distanceAB,  // C->D is closer than A->B
    isCloser: distanceCD < distanceAB,
    distanceAB,
    distanceCD,
  };
}

/**
 * Execute point-in-polygon check
 */
function executePointInPolygon(inputs: Record<string, any>): Record<string, any> {
  const point = inputs.point as Coord;
  const polygon = inputs.polygon as Coord[];
  
  if (!point || !polygon || polygon.length < 3) {
    return { result: false, error: 'Missing or invalid polygon data' };
  }
  
  return {
    result: pointInPolygon(point, polygon),
    isInside: pointInPolygon(point, polygon),
  };
}

/**
 * Execute point-in-circle check
 */
function executePointInCircle(inputs: Record<string, any>): Record<string, any> {
  const point = inputs.point as Coord;
  const center = inputs.center as Coord;
  const radius = inputs.radius as number;
  
  if (!point || !center || radius === undefined) {
    return { result: false, error: 'Missing point, center, or radius' };
  }
  
  const distance = haversine(point, center);
  return {
    result: pointInCircle(point, center, radius),
    isInside: pointInCircle(point, center, radius),
    distance,
  };
}

/**
 * Execute bearing calculation
 */
function executeBearingCalculation(inputs: Record<string, any>): Record<string, any> {
  const from = inputs.from as Coord;
  const to = inputs.to as Coord;
  
  if (!from || !to) {
    return { result: '', error: 'Missing from/to points' };
  }
  
  const bearingValue = bearing(from, to);
  
  // Map bearing to cardinal direction
  const getCardinalDirection = (b: number): string => {
    const normalized = ((b + 360) % 360);
    if (normalized >= 315 || normalized < 45) return 'North';
    if (normalized >= 45 && normalized < 135) return 'East';
    if (normalized >= 135 && normalized < 225) return 'South';
    return 'West';
  };
  
  return {
    result: getCardinalDirection(bearingValue),
    direction: getCardinalDirection(bearingValue),
    bearing: bearingValue,
  };
}

/**
 * Execute distance threshold check
 */
function executeDistanceThreshold(inputs: Record<string, any>): Record<string, any> {
  const pointA = inputs.pointA as Coord;
  const pointB = inputs.pointB as Coord;
  const threshold = inputs.threshold as number;
  
  if (!pointA || !pointB || threshold === undefined) {
    return { result: false, error: 'Missing points or threshold' };
  }
  
  const distance = haversine(pointA, pointB);
  return {
    result: distance <= threshold,
    isWithin: distance <= threshold,
    distance,
  };
}

/**
 * Execute text match check
 */
function executeTextMatch(inputs: Record<string, any>): Record<string, any> {
  const text = inputs.text as string;
  const expected = inputs.expected as string;
  
  if (text === undefined || expected === undefined) {
    return { result: false, error: 'Missing text or expected value' };
  }
  
  const normalizedText = String(text).toLowerCase().trim();
  const normalizedExpected = String(expected).toLowerCase().trim();
  
  return {
    result: normalizedText === normalizedExpected,
    isMatch: normalizedText === normalizedExpected,
    text: normalizedText,
    expected: normalizedExpected,
  };
}

/**
 * Execute feature containment check (async)
 */
async function executeFeatureContainment(inputs: Record<string, any>): Promise<Record<string, any>> {
  const point = inputs.point as Coord;
  const featureName = inputs.featureName as string;
  
  if (!point || !featureName) {
    return { result: false, error: 'Missing point or feature name' };
  }
  
  const polygon = await getPolygonForFeature(featureName);
  if (!polygon || polygon.length < 3) {
    return { result: false, error: 'Could not load polygon for feature' };
  }
  
  const isInside = pointInPolygon(point, polygon);
  return {
    result: isInside,
    isInside,
    featureName,
    polygon,
  };
}

/**
 * Execute polygon containment check
 */
function executePolygonContainment(inputs: Record<string, any>): Record<string, any> {
  const point = inputs.point as Coord;
  const polygon = inputs.polygon as Coord[];
  
  if (!point || !polygon || polygon.length < 3) {
    return { result: false, error: 'Missing or invalid polygon data' };
  }
  
  return {
    result: pointInPolygon(point, polygon),
    isInside: pointInPolygon(point, polygon),
  };
}

/**
 * Execute relative heading check (for Relative category)
 */
function executeRelativeHeading(inputs: Record<string, any>): Record<string, any> {
  const from = inputs.from as Coord;
  const to = inputs.to as Coord;
  const splitDirection = inputs.splitDirection as string;
  
  if (!from || !to) {
    return { result: false, error: 'Missing from/to points' };
  }
  
  // Convert Coord {lat, lon} to [lon, lat] array format expected by getRelativeHeading
  const p1 = [from.lon, from.lat] as [number, number];
  const p2 = [to.lon, to.lat] as [number, number];
  const relativeHeading = getRelativeHeading(p1, p2);
  const normalizedPlaceholder = (splitDirection || '').toLowerCase();
  
  // Check the appropriate axis
  let isMatch = false;
  if (normalizedPlaceholder === 'north' || normalizedPlaceholder === 'south') {
    isMatch = relativeHeading.lat.toLowerCase() === normalizedPlaceholder;
  } else if (normalizedPlaceholder === 'east' || normalizedPlaceholder === 'west') {
    isMatch = relativeHeading.lon.toLowerCase() === normalizedPlaceholder;
  }
  
  return {
    result: isMatch,
    isMatch,
    heading: relativeHeading,
    splitDirection: normalizedPlaceholder,
  };
}

/**
 * Execute hotter/colder check
 */
function executeHotterColder(inputs: Record<string, any>): Record<string, any> {
  const previousLoc = inputs.previousLoc as Coord;
  const targetLoc = inputs.targetLoc as Coord;
  const currentLoc = inputs.currentLoc as Coord;
  
  if (!previousLoc || !targetLoc || !currentLoc) {
    return { result: false, error: 'Missing locations for hotter/colder' };
  }
  
  const previousDistance = haversine(previousLoc, targetLoc);
  const currentDistance = haversine(currentLoc, targetLoc);
  const distanceChange = previousDistance - currentDistance;
  
  return {
    result: currentDistance < previousDistance,
    isGettingCloser: currentDistance < previousDistance,
    previousDistance,
    currentDistance,
    distanceChange,
  };
}

/**
 * Execute closer-to-line check
 */
function executeCloserToLine(inputs: Record<string, any>): Record<string, any> {
  const linePoint1 = inputs.linePoint1 as Coord;
  const linePoint2 = inputs.linePoint2 as Coord;
  const targetLoc = inputs.targetLoc as Coord;
  const seekerLoc = inputs.seekerLoc as Coord;
  
  if (!linePoint1 || !linePoint2 || !targetLoc || !seekerLoc) {
    return { result: false, error: 'Missing points for closer-to-line' };
  }
  
  // Calculate distance from a point to a line segment
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
  
  return {
    result: seekerToLine < targetToLine,
    isCloser: seekerToLine < targetToLine,
    seekerToLine,
    targetToLine,
  };
}

/**
 * Execute the appropriate operation based on config
 */
async function executeOperation(
  op: ConfigurableOperation,
  inputs: Record<string, any>
): Promise<Record<string, any> | null> {
  switch (op) {
    case 'distance_comparison':
      return executeDistanceComparison(inputs);
    case 'point_in_polygon':
      return executePointInPolygon(inputs);
    case 'point_in_circle':
      return executePointInCircle(inputs);
    case 'bearing_calculation':
      return executeBearingCalculation(inputs);
    case 'distance_threshold':
      return executeDistanceThreshold(inputs);
    case 'text_match':
      return executeTextMatch(inputs);
    case 'feature_containment':
      return executeFeatureContainment(inputs);
    case 'polygon_containment':
      return executePolygonContainment(inputs);
    case 'relative_heading':
      return executeRelativeHeading(inputs);
    case 'hotter_colder':
      return executeHotterColder(inputs);
    case 'closer_to_line':
      return executeCloserToLine(inputs);
    default:
      console.log(`[handlerFactory] Unknown operation: ${op}`);
      return null;
  }
}

// ============================================================================
// HANDLER FACTORY
// ============================================================================

/**
 * Create a handler from a configuration
 */
export function createHandlerFromConfig(config: HandlerConfig): AutomationHandler {
  return async (ctx: AutomationContext): Promise<AutoAnswer | null> => {
    // Extract all inputs
    const extractedInputs: Record<string, any> = {};
    for (const input of config.inputs) {
      const value = extractValue(ctx, input.extractor);
      if (value === null) {
        console.log(`[ConfigHandler] Missing input: ${input.name} from ${input.extractor.source}.${input.extractor.path}`);
        return null;
      }
      extractedInputs[input.name] = value;
    }
    
    // Execute the operation
    let operationResult: Record<string, any> | null;
    try {
      if (config.async) {
        operationResult = await executeOperation(config.operation, extractedInputs);
      } else {
        // For sync operations, we still use await to handle any potential promises
        operationResult = await executeOperation(config.operation, extractedInputs);
      }
    } catch (error) {
      console.log(`[ConfigHandler] Error executing operation ${config.operation}:`, error);
      return null;
    }
    
    if (!operationResult) {
      console.log(`[ConfigHandler] Operation ${config.operation} returned null`);
      return null;
    }
    
    // Get the result value
    const resultValue = operationResult[config.output.resultField];
    
    if (resultValue === undefined) {
      console.log(`[ConfigHandler] Result field ${config.output.resultField} not found in operation result`);
      return null;
    }
    
    // Render text template if provided
    let text: string | undefined;
    if (config.output.textTemplate) {
      text = renderTemplate(config.output.textTemplate, {
        ...extractedInputs,
        ...operationResult,
      });
    }
    
    return {
      result: resultValue,
      metadata: {
        text,
        confidence: 100,
        computationMethod: config.output.computationMethod,
      },
    };
  };
}
