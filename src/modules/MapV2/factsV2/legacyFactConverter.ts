/**
 * ============================================================================
 * TEMPORARY FILE — delete this whole module once the backend serves facts
 * already shaped to the FactsV2 contract (OP_TYPE / op_meta from
 * "Ask to Fact"). Nothing outside MapCanvas.tsx should ever import from
 * here — the moment GET /facts/ returns FactsV2-shaped facts directly, this
 * file and that one import go away together.
 * ============================================================================
 *
 * The live /facts/ API still returns facts in the pre-FactsV2 shape the old
 * Map's drawing tools produced: op_type values like "draw-circle",
 * "split-by-direction", "areas", ... and an op_meta shaped like the
 * `Operation` type in src/utils/geoTypes.ts (points, radius, hiderLocation,
 * splitDirection, areaOpType, uploadedArea, multiLineString, closerFurther,
 * preferredPoint, selectedLineIndex, polygonGeoJSON, featureName).
 *
 * Every branch below mirrors — deliberately, line for line where possible —
 * what src/utils/geoWorker.ts's applySingleOperation() actually does for
 * that op_type (intersect vs difference, which point/line/polygon it reads),
 * just re-expressed as an assertedAnswer/value pair so the result goes
 * through the exact same factToRegion() resolvers as every other fact.
 * Facts whose target geometry is inline in the legacy payload (an uploaded
 * area, a clicked-on polygon, a drawn line) use FactDto's `geometry`
 * override (see factTypes.ts) rather than inventing registry keys for
 * one-off shapes.
 *
 * Only fact_type: 'GEO' facts convert; TEXT facts, and any op_type this
 * file doesn't recognise (e.g. the legacy "play-area" pseudo-op), are
 * skipped — same as the old src/utils/factUtils.ts#convertBackendFactToOperation.
 */
import { Feature, LineString, MultiPolygon, Polygon } from 'geojson';
import { booleanPointInPolygon, point as turfPoint } from '@turf/turf';
import { Fact } from '../../../models/Fact';
import { ANSWER, Answer, FACT_TYPE, FactDto, OP_TYPE, OpType } from './factTypes';

const DIRECTION_TO_ANSWER: Record<string, Answer> = {
  North: ANSWER.NORTH,
  South: ANSWER.SOUTH,
  East: ANSWER.EAST,
  West: ANSWER.WEST,
};

const toResolvedPoint = (coords: [number, number]) => ({
  lon: String(coords[0]),
  lat: String(coords[1]),
  source: 'MAP_POINT' as const,
});

/** Mirrors geoWorker.ts's findContainingPolygon — the legacy
 * "polygon-location" op resolves its target polygon at apply time by
 * finding whichever feature in a bundled GeoJSON contains the clicked
 * point, rather than naming a registry key up front. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findContainingPolygon(pt: number[], geojson: any): Feature<Polygon | MultiPolygon> | null {
  if (!geojson) return null;
  let found: Feature<Polygon | MultiPolygon> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visit = (item: any): void => {
    if (found || !item) return;
    if (item.type === 'Feature' && (item.geometry?.type === 'Polygon' || item.geometry?.type === 'MultiPolygon')) {
      if (booleanPointInPolygon(turfPoint(pt), item)) found = item;
    } else if (item.type === 'FeatureCollection') {
      for (const f of item.features) {
        visit(f);
        if (found) break;
      }
    } else if (item.type === 'Polygon' || item.type === 'MultiPolygon') {
      if (booleanPointInPolygon(turfPoint(pt), item)) found = { type: 'Feature', geometry: item, properties: {} };
    }
  };
  visit(geojson);
  return found;
}

/** Mirrors geoWorker.ts's inline uploadedArea handling in the "areas" branch. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPolygonFeature(uploadedArea: any, index: number): Feature<Polygon | MultiPolygon> | null {
  if (!uploadedArea) return null;
  if (uploadedArea.type === 'Feature' && (uploadedArea.geometry?.type === 'Polygon' || uploadedArea.geometry?.type === 'MultiPolygon')) {
    return uploadedArea;
  }
  if (uploadedArea.type === 'Polygon' || uploadedArea.type === 'MultiPolygon') {
    return { type: 'Feature', geometry: uploadedArea, properties: {} };
  }
  if (uploadedArea.type === 'FeatureCollection') {
    const feature = uploadedArea.features[index] ?? uploadedArea.features[0];
    if (feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon') return feature;
  }
  return null;
}

/** Mirrors geoWorker.ts's splitPolygonByLineDistance's line-selection step
 * for the "closer-to-line" op. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLineFeature(multiLineString: any, index: number): Feature<LineString> | null {
  if (!multiLineString) return null;
  if (multiLineString.type === 'FeatureCollection') {
    return multiLineString.features[index] ?? multiLineString.features[0] ?? null;
  }
  if (multiLineString.type === 'Feature' && multiLineString.geometry?.type === 'LineString') return multiLineString;
  if (multiLineString.type === 'LineString') return { type: 'Feature', geometry: multiLineString, properties: {} };
  return null;
}

/**
 * Converts one legacy fact to a FactsV2 FactDto, or null if it's not a GEO
 * fact or its op_type isn't one this converter recognises.
 */
export function convertLegacyFact(raw: Fact): FactDto | null {
  if (raw.fact_type !== 'GEO') return null;

  const meta = raw.fact_info.op_meta as Record<string, unknown>;
  const points = (Array.isArray(meta.points) ? meta.points : []) as [number, number][];

  let opType: OpType;
  let opMeta: Record<string, unknown> & { assertedAnswer: Answer; value: boolean };

  switch (raw.fact_info.op_type) {
    case 'draw-circle': {
      if (points.length < 1) return null;
      opType = OP_TYPE.POINT_BUFFER_INSIDE;
      opMeta = {
        point: toResolvedPoint(points[0]),
        radius: Math.round(((meta.radius as number) ?? 0) * 1000), // legacy radius is kilometres
        assertedAnswer: ANSWER.INSIDE,
        value: meta.hiderLocation === 'inside',
      };
      break;
    }

    case 'split-by-direction': {
      if (points.length < 1) return null;
      const answer = DIRECTION_TO_ANSWER[meta.splitDirection as string];
      if (!answer) return null;
      opType = OP_TYPE.POINT_SPLIT;
      opMeta = {
        point: toResolvedPoint(points[0]),
        assertedAnswer: answer,
        value: true, // the legacy op has no negated-direction variant
      };
      break;
    }

    case 'hotter-colder': {
      if (points.length < 2) return null;
      opType = OP_TYPE.TWO_POINT_BISECTOR;
      opMeta = {
        point: toResolvedPoint(points[0]),
        pointFinal: toResolvedPoint(points[1]),
        // geoWorker.ts keeps the half nearer whichever point is preferred;
        // our TWO_POINT_BISECTOR keeps HOTTER nearer pointFinal (p2).
        assertedAnswer: meta.preferredPoint === 'p2' ? ANSWER.HOTTER : ANSWER.COLDER,
        value: true,
      };
      break;
    }

    case 'areas': {
      const polygonFeature = extractPolygonFeature(meta.uploadedArea, (meta.selectedLineIndex as number) ?? 0);
      if (!polygonFeature) return null;
      opType = OP_TYPE.POLYGON_INSIDE;
      opMeta = {
        polygon: (meta.featureName as string) || `legacy-area-${raw.fact_id}`,
        geometry: polygonFeature.geometry,
        assertedAnswer: ANSWER.INSIDE,
        value: meta.areaOpType === 'inside',
      };
      break;
    }

    case 'closer-to-line': {
      if (points.length < 1) return null;
      const lineFeature = extractLineFeature(meta.multiLineString, (meta.selectedLineIndex as number) ?? 0);
      if (!lineFeature) return null;
      opType = OP_TYPE.LINE_POINT_BUFFER_INSIDE;
      opMeta = {
        line: `legacy-line-${raw.fact_id}`,
        geometry: lineFeature.geometry,
        point: toResolvedPoint(points[0]),
        assertedAnswer: ANSWER.INSIDE,
        value: meta.closerFurther === 'closer',
      };
      break;
    }

    case 'polygon-location': {
      if (points.length < 1 || !meta.polygonGeoJSON) return null;
      const found = findContainingPolygon(points[0], meta.polygonGeoJSON);
      if (!found) return null;
      opType = OP_TYPE.POLYGON_INSIDE;
      opMeta = {
        polygon: (meta.featureName as string) || `legacy-area-${raw.fact_id}`,
        geometry: found.geometry,
        assertedAnswer: ANSWER.INSIDE,
        value: true, // geoWorker.ts never differences this one
      };
      break;
    }

    default:
      // e.g. the legacy "play-area" pseudo-op, or anything unrecognised.
      return null;
  }

  return {
    fact_id: raw.fact_id,
    fact_type: FACT_TYPE.GEO,
    question_id: raw.fact_id, // legacy facts carry no question_id of their own
    answer_id: raw.fact_id,
    fact_info: { op_type: opType, op_meta: opMeta },
    created: raw.created,
    modified: raw.modified,
  };
}

export function convertLegacyFacts(raw: Fact[]): FactDto[] {
  return raw.map(convertLegacyFact).filter((f): f is FactDto => f !== null);
}
