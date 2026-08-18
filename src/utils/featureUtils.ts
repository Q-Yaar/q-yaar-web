/**
 * Utility functions for working with GeoJSON features by name
 * Used for Matching questions to check if coordinates are within a named feature's polygon
 */

import type { FeatureCollection, Feature, Polygon, MultiPolygon, GeoJsonProperties } from 'geojson';
import type { Coord } from './geoTypes';
import { pointInPolygon } from './geoUtils';
import { getGeoJson } from './geoJsonLoader';
import { ALL_AREAS, AreaConfig } from '../config/areaConfig';

/**
 * Cache for feature lookups
 */
const featureCache = new Map<string, Promise<Feature | null>>();

/**
 * Get a GeoJSON feature by its feature name and GeoJSON path
 * Looks up the feature in the specified GeoJSON file using the feature property
 */
async function getFeatureByName(
  geoJsonPath: string,
  featureProperty: string,
  featureName: string
): Promise<Feature | null> {
  const cacheKey = `${geoJsonPath}|${featureProperty}|${featureName}`;
  
  if (!featureCache.has(cacheKey)) {
    const promise = (async () => {
      try {
        const geoJson = await getGeoJson(geoJsonPath);
        return geoJson.features.find(f => 
          String(f.properties?.[featureProperty as keyof GeoJsonProperties]) === featureName
        ) || null;
      } catch (error) {
        console.error(`[featureUtils] Failed to load feature: ${featureName}`, error);
        return null;
      }
    })();
    featureCache.set(cacheKey, promise);
  }
  
  return featureCache.get(cacheKey)!;
}

/**
 * Extract coordinates from a GeoJSON geometry as an array of Coord
 * Handles both Polygon and MultiPolygon geometries
 */
function extractFeatureCoordinates(feature: Feature): Coord[] | null {
  const geometry = feature.geometry;
  if (!geometry) {
    console.warn(`[featureUtils] Feature has no geometry`);
    return null;
  }

  console.log(`[featureUtils] Geometry type: ${geometry.type}`, geometry);

  const extractCoords = (coords: number[][]): Coord[] => {
    return coords.map(coord => ({
      lat: coord[1],
      lon: coord[0]
    }));
  };

  switch (geometry.type) {
    case 'Polygon':
      // Return the outer ring (first ring of the polygon)
      if (!geometry.coordinates || geometry.coordinates.length === 0) {
        console.warn(`[featureUtils] Polygon has no coordinates`);
        return null;
      }
      return extractCoords(geometry.coordinates[0]);
    
    case 'MultiPolygon':
      // For MultiPolygon, use the first polygon's outer ring
      if (geometry.coordinates.length > 0 && geometry.coordinates[0].length > 0) {
        return extractCoords(geometry.coordinates[0][0]);
      }
      console.warn(`[featureUtils] MultiPolygon has empty coordinates`);
      return null;
    
    default:
      console.warn(`[featureUtils] Unsupported geometry type: ${geometry.type}`);
      return null;
  }
}

/**
 * Get the polygon coordinates for a feature name
 * Looks up the area config, finds the GeoJSON, and extracts the polygon
 */
export async function getPolygonForFeature(featureName: string): Promise<Coord[] | null> {
  if (!featureName) return null;

  // Find the area config that matches this feature name
  const areaConfig = ALL_AREAS.find(a => 
    a.displayName === featureName || 
    a.featureIdentifier === featureName
  );
  
  if (!areaConfig) {
    console.warn(`[featureUtils] No area config found for feature: ${featureName}`);
    console.warn(`[featureUtils] Available configs:`, ALL_AREAS.map(a => ({ displayName: a.displayName, featureIdentifier: a.featureIdentifier })));
    return null;
  }

  console.log(`[featureUtils] Found area config for "${featureName}":`, {
    displayName: areaConfig.displayName,
    featureProperty: areaConfig.featureProperty,
    featureIdentifier: areaConfig.featureIdentifier,
    geoJsonPath: areaConfig.geoJsonPath
  });

  // If a specific feature identifier is specified, use it
  const targetFeatureName = areaConfig.featureIdentifier || featureName;
  console.log(`[featureUtils] Target feature name: ${targetFeatureName}`);
  
  const feature = await getFeatureByName(
    areaConfig.geoJsonPath,
    areaConfig.featureProperty,
    targetFeatureName
  );
  
  if (!feature) {
    console.warn(`[featureUtils] Feature not found: ${targetFeatureName}`);
    console.warn(`[featureUtils] Searched in: ${areaConfig.geoJsonPath} with property: ${areaConfig.featureProperty}`);
    return null;
  }

  console.log(`[featureUtils] Found feature:`, feature);

  const coords = extractFeatureCoordinates(feature);
  console.log(`[featureUtils] Extracted coordinates (${coords?.length || 0} points):`, coords);

  return coords;
}

/**
 * Check if a point is inside a named feature's polygon
 * This is the main function used for Matching questions
 */
export async function isPointInFeature(
  point: Coord,
  featureName: string
): Promise<boolean> {
  const polygon = await getPolygonForFeature(featureName);
  if (!polygon || polygon.length < 3) return false;
  
  return pointInPolygon(point, polygon);
}

/**
 * Preload all features for faster lookups
 */
export async function preloadAllFeatures(): Promise<void> {
  // Preload all GeoJSON files
  const paths = new Set(ALL_AREAS.map(a => a.geoJsonPath));
  await Promise.all(Array.from(paths).map(path => getGeoJson(path)));
}
