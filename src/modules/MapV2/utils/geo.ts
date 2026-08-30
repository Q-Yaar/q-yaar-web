import { Feature, MultiPolygon, Polygon } from 'geojson';

/**
 * Some GeoJSON assets (e.g. bengaluru_urban_district.geojson) are a
 * FeatureCollection of several Polygon parts rather than one Feature —
 * folds those into a single MultiPolygon Feature. Also accepts an
 * already-a-Feature or bare-geometry payload. Shared by registries.ts (the
 * play-area/universe for fact folding) and useMapInstance.ts (the
 * always-visible game-area boundary and exterior shading), so both read
 * the same shape from the same raw fetch.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePlayArea(geojson: any): Feature<Polygon | MultiPolygon> {
  if (geojson.type === 'Feature') return geojson;

  if (geojson.type === 'FeatureCollection') {
    const polygonCoordinates = (geojson.features as Feature<Polygon | MultiPolygon>[])
      .filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
      .flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));

    return {
      type: 'Feature',
      geometry: { type: 'MultiPolygon', coordinates: polygonCoordinates },
      properties: {},
    };
  }

  // A bare geometry object (no Feature/FeatureCollection wrapper).
  return { type: 'Feature', geometry: geojson, properties: {} };
}
