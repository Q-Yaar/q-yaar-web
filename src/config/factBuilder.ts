/**
 * Fact Builder
 *
 * Config-driven resolver that turns a FactBuilderConfig into the op_meta for a
 * fact created from an accepted question. This mirrors the config-driven
 * HandlerConfig/handlerFactory pattern, but for the fact-creation phase.
 *
 * Categories without a factBuilder fall back to the generic field-mapping path
 * in AskQuestionModule.createFactFromQuestion.
 */

import type { Coord } from '../utils/geoTypes';
import type { AskedQuestion } from '../models/QnA';
import { calculateDistance } from '../utils/geoUtils';
import { parseCoord, parseLocationPoint } from './coordParsing';
import type {
  FactBuilderConfig,
  FactBuilderValue,
  ValueExtractor,
  UIToolType,
} from './questionCategories.types';

/**
 * Result of resolving a fact builder: the op_type and the (geometry-only)
 * op_meta. Provenance metadata (sourceQuestionId, createdFrom, etc.) is added
 * by the caller.
 */
export interface ResolvedFactBuilder {
  opType: UIToolType;
  opMeta: Record<string, any>;
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Get a nested value from an object using a path string.
 * Supports dot notation and array indexing: 'location_points[0]', 'radius'.
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;

  const arrayIndexPattern = /^(.+?)\[(\d+)\]$/;
  const match = path.match(arrayIndexPattern);
  if (match) {
    const propName = match[1];
    const index = parseInt(match[2], 10);
    const array = obj[propName];
    if (Array.isArray(array) && index >= 0 && index < array.length) {
      return array[index];
    }
    return undefined;
  }

  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Parse a raw coordinate value into a Coord { lat, lon } (numeric).
 * Accepts { lat, lon } objects (string- or number-valued) and "lat,lon" strings.
 */
function toCoord(raw: any): Coord | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object' && 'lat' in raw && 'lon' in raw) {
    return parseLocationPoint(raw as { lat: any; lon: any });
  }
  if (typeof raw === 'string') {
    return parseCoord(raw);
  }
  return null;
}

/**
 * Extract a raw value from the question context using an extractor.
 * Only question_meta and fact_meta sources are supported for fact building
 * (context.hiderLocation is a live answer-time input, not persisted in facts).
 */
function extractRawValue(question: AskedQuestion, extractor: ValueExtractor): any {
  switch (extractor.source) {
    case 'question_meta':
      return getNestedValue(question.question_meta, extractor.path);
    case 'fact_meta':
      return getNestedValue((question as any).fact_meta, extractor.path);
    case 'context':
      // Not used by fact builders; facts are derived from the accepted
      // question, not live answer-time context.
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Extract a coordinate from the question and convert to the [lng, lat] array
 * ordering used by op_meta / geoWorker. Returns null if unavailable/invalid.
 */
function extractCoordLngLat(question: AskedQuestion, extractor: ValueExtractor): [number, number] | null {
  const raw = extractRawValue(question, extractor);
  const coord = toCoord(raw);
  if (!coord) return null;
  const lng = Number(coord.lon);
  const lat = Number(coord.lat);
  if (isNaN(lng) || isNaN(lat)) return null;
  return [lng, lat];
}

// ============================================================================
// EMPTY-VALUE FILTERING
// ============================================================================

/**
 * Whether a resolved value should be omitted from op_meta (mirrors the
 * filtering in createFactFromQuestion's generic path).
 */
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (typeof value === 'string' && value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) return true;
  return false;
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Resolve a single FactBuilderValue to its concrete value, or undefined if
 * the required inputs are missing.
 */
function resolveValue(question: AskedQuestion, value: FactBuilderValue): unknown {
  switch (value.kind) {
    case 'point': {
      return extractCoordLngLat(question, value.extract);
    }

    case 'points': {
      const points: [number, number][] = [];
      for (const ext of value.extracts) {
        const pt = extractCoordLngLat(question, ext);
        if (!pt) return undefined; // missing point -> whole field omitted
        points.push(pt);
      }
      return points;
    }

    case 'distance_km': {
      const a = extractCoordLngLat(question, value.a);
      const b = extractCoordLngLat(question, value.b);
      if (!a || !b) return undefined;
      return calculateDistance(a, b); // kilometers
    }

    case 'fromAcceptedResult': {
      const accepted = String((question as any).answer_meta?.result ?? '').toLowerCase();
      if (accepted === 'true') return value.true;
      if (accepted === 'false') return value.false;
      return undefined;
    }

    case 'literal':
      return value.value;

    default:
      return undefined;
  }
}

/**
 * Resolve a FactBuilderConfig into the op_type and geometry op_meta for a fact
 * created from an accepted question. Empty/missing fields are filtered out.
 */
export function resolveFactBuilder(
  config: FactBuilderConfig,
  question: AskedQuestion,
): ResolvedFactBuilder {
  const opMeta: Record<string, any> = {};
  for (const [key, valueConfig] of Object.entries(config.fields)) {
    const resolved = resolveValue(question, valueConfig);
    if (isEmptyValue(resolved)) continue;
    opMeta[key] = resolved;
  }
  return { opType: config.opType, opMeta };
}
