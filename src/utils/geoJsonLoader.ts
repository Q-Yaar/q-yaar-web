import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';
import { AreaConfig, ALL_AREAS, getUniqueGeoJsonPaths } from '../config/areaConfig';

export { getUniqueGeoJsonPaths } from '../config/areaConfig';

/**
 * Cached GeoJSON data to avoid repeated fetches
 */
const geoJsonCache = new Map<string, Promise<FeatureCollection>>();

/**
 * Fetch and parse a GeoJSON file
 */
async function fetchGeoJson(path: string): Promise<FeatureCollection> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load GeoJSON: ${path} (${response.status})`);
  }
  return response.json();
}

/**
 * Get GeoJSON data with caching
 */
export async function getGeoJson(path: string): Promise<FeatureCollection> {
  if (!geoJsonCache.has(path)) {
    geoJsonCache.set(path, fetchGeoJson(path));
  }
  return geoJsonCache.get(path)!;
}

/**
 * Preload all GeoJSON files used by areas
 */
export async function preloadAllGeoJsons(): Promise<void> {
  const paths = getUniqueGeoJsonPaths();
  await Promise.all(paths.map(path => getGeoJson(path)));
}

/**
 * Result of resolving an area selection to a feature name
 */
export interface ResolvedArea {
  // The feature name to use for automation (e.g., "Bengaluru Central City Corporation")
  featureName: string;
  // The GeoJSON path that contains this feature
  geoJsonPath: string;
  // The property key used to extract the feature name
  featureProperty: string;
}

/**
 * Resolve an area display name to its actual feature name in the GeoJSON
 * This is used to map UI selections to values that can be used in automation
 */
export async function resolveAreaToFeatureName(
  areaDisplayName: string
): Promise<ResolvedArea | null> {
  const areaConfig = ALL_AREAS.find(a => a.displayName === areaDisplayName);
  if (!areaConfig) {
    console.warn(`[geoJsonLoader] Unknown area display name: ${areaDisplayName}`);
    return null;
  }

  try {
    const geoJson = await getGeoJson(areaConfig.geoJsonPath);
    
    // If a specific feature identifier is specified, find that feature
    if (areaConfig.featureIdentifier) {
      const feature = geoJson.features.find(f => 
        f.properties?.[areaConfig.featureProperty] === areaConfig.featureIdentifier
      );
      if (feature) {
        return {
          featureName: String(feature.properties?.[areaConfig.featureProperty] || areaConfig.displayName),
          geoJsonPath: areaConfig.geoJsonPath,
          featureProperty: areaConfig.featureProperty,
        };
      }
      // Fallback: use display name if feature not found
      return {
        featureName: areaConfig.displayName,
        geoJsonPath: areaConfig.geoJsonPath,
        featureProperty: areaConfig.featureProperty,
      };
    }

    // If no specific identifier, use the display name as the feature name
    // This assumes the display name matches a property value in the GeoJSON
    return {
      featureName: areaConfig.displayName,
      geoJsonPath: areaConfig.geoJsonPath,
      featureProperty: areaConfig.featureProperty,
    };
  } catch (error) {
    console.error(`[geoJsonLoader] Failed to resolve area: ${areaDisplayName}`, error);
    return null;
  }
}

/**
 * Get the feature name property value from a GeoJSON feature
 */
export function getFeatureName(
  feature: Feature,
  featureProperty: string,
  fallbackName: string
): string {
  const props = feature.properties || {};
  return String(props[featureProperty as keyof GeoJsonProperties] || fallbackName);
}

/**
 * Find a feature in a GeoJSON by its property value
 */
export function findFeatureByProperty(
  geoJson: FeatureCollection,
  propertyKey: string,
  propertyValue: string
): Feature | null {
  return geoJson.features.find(f => 
    f.properties?.[propertyKey] === propertyValue
  ) || null;
}

/**
 * Get all feature names from a GeoJSON using a specific property
 */
export function getFeatureNamesFromGeoJson(
  geoJson: FeatureCollection,
  propertyKey: string
): string[] {
  return geoJson.features
    .map(f => f.properties?.[propertyKey])
    .filter(Boolean)
    .map(String);
}
