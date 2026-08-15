/**
 * Area Configuration for GeoJSON-based questions
 * Maps UI-friendly names to GeoJSON file paths and feature identifiers
 */

export interface AreaConfig {
  // Display name for UI dropdowns
  displayName: string;
  // Path to the GeoJSON file (relative to /public)
  geoJsonPath: string;
  // Property key in GeoJSON features to use as the feature identifier
  // e.g., if features have {properties: {name: "Central", NewCorp: "Central"}},
  // you can use "name" or "NewCorp" as the identifier property
  featureProperty: string;
  // Optional: specific feature identifier to match (if not all features should be used)
  // If null, all features in the GeoJSON are available
  featureIdentifier?: string | null;
}

/**
 * Bengaluru Corporations (BBMP Wards)
 * GeoJSON: bengaluru-corporations.geojson
 * Features have properties: { name, NewCorp, OBJECTID, ... }
 * The actual feature names in the GeoJSON are like "Bengaluru Central City Corporation"
 */
export const BENGALURU_CORPORATIONS: AreaConfig[] = [
  { displayName: 'Bengaluru Central City Corporation', featureProperty: 'name', geoJsonPath: '/assets/geojsons/bengaluru/bengaluru-corporations.geojson' },
];

/**
 * Bengaluru Urban District
 * GeoJSON: bengaluru_urban_district.geojson
 * Features have properties: { name, official_name, ... }
 */
export const BENGALURU_URBAN_DISTRICT: AreaConfig = {
  displayName: 'Bengaluru Urban District',
  featureProperty: 'name',
  geoJsonPath: '/assets/geojsons/bengaluru/bengaluru_urban_district.geojson',
  featureIdentifier: null, // Use the single feature in this file
};

/**
 * Metro Lines
 * GeoJSON: metro_lines.geojson
 * Features have properties: { name, ref, colour, ... }
 */
export const METRO_LINES: AreaConfig[] = [
  { displayName: 'Purple Line', featureProperty: 'ref', geoJsonPath: '/assets/geojsons/bengaluru/metro_lines.geojson', featureIdentifier: 'Purple' },
  { displayName: 'Green Line', featureProperty: 'ref', geoJsonPath: '/assets/geojsons/bengaluru/metro_lines.geojson', featureIdentifier: 'Green' },
];

/**
 * Metro Nearest Regions
 * GeoJSON: metro_nearest_regions.geojson
 * Features have properties: { name, line_id, ... }
 * Example: "Yellow Line (Silk Board Line)"
 */
export const METRO_REGIONS: AreaConfig[] = [
  { displayName: 'Yellow Line (Silk Board Line)', featureProperty: 'name', geoJsonPath: '/assets/geojsons/bengaluru/metro_nearest_regions.geojson' },
];

/**
 * All available areas grouped by category
 */
export const AREA_CATEGORIES = {
  'BBMP Corporations': BENGALURU_CORPORATIONS,
  'Bengaluru Urban District': [BENGALURU_URBAN_DISTRICT],
  'Metro Lines': METRO_LINES,
  'Metro Regions': METRO_REGIONS,
} as const;

/**
 * Flattened list of all areas for easy lookup
 */
export const ALL_AREAS: AreaConfig[] = [
  ...BENGALURU_CORPORATIONS,
  BENGALURU_URBAN_DISTRICT,
  ...METRO_LINES,
  ...METRO_REGIONS,
];

/**
 * Get an AreaConfig by its display name
 */
export function getAreaConfigByName(displayName: string): AreaConfig | null {
  return ALL_AREAS.find(area => area.displayName === displayName) || null;
}

/**
 * Get all unique GeoJSON paths that need to be loaded
 */
export function getUniqueGeoJsonPaths(): string[] {
  const paths = new Set<string>();
  ALL_AREAS.forEach(area => paths.add(area.geoJsonPath));
  return Array.from(paths);
}
