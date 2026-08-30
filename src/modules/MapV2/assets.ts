/**
 * Every static asset MapV2 loads from public/. Corporations and metro
 * lines/regions each get their own GeoJSON file (one region per file —
 * e.g. METRO_GREEN_LINE.geojson, its region METRO_GREEN_LINE_REGION.geojson)
 * rather than the combined files the old Map's Sidebar still reads
 * (bengaluru-corporations.geojson, metro_lines.geojson,
 * metro_nearest_regions.geojson) — those stay untouched since old code
 * depends on them; these are separate copies split out for MapV2.
 */

export const publicUrl = (path: string): string => `${process.env.PUBLIC_URL || ''}${path}`;
const GEOJSON_DIR = '/assets/geojsons/bengaluru';
const regionUrl = (key: string): string => publicUrl(`${GEOJSON_DIR}/${key}.geojson`);

export const CORPORATION_ASSET_URLS: Record<string, string> = {
  BLR_CENTRAL_CORP: regionUrl('BLR_CENTRAL_CORP'),
  BLR_EAST_CORP: regionUrl('BLR_EAST_CORP'),
  BLR_NORTH_CORP: regionUrl('BLR_NORTH_CORP'),
  BLR_SOUTH_CORP: regionUrl('BLR_SOUTH_CORP'),
  BLR_WEST_CORP: regionUrl('BLR_WEST_CORP'),
};

export const METRO_LINE_ASSET_URLS: Record<string, string> = {
  METRO_PURPLE_LINE: regionUrl('METRO_PURPLE_LINE'),
  METRO_GREEN_LINE: regionUrl('METRO_GREEN_LINE'),
  METRO_YELLOW_LINE: regionUrl('METRO_YELLOW_LINE'),
};

export const METRO_LINE_REGION_ASSET_URLS: Record<string, string> = {
  METRO_PURPLE_LINE_REGION: regionUrl('METRO_PURPLE_LINE_REGION'),
  METRO_GREEN_LINE_REGION: regionUrl('METRO_GREEN_LINE_REGION'),
  METRO_YELLOW_LINE_REGION: regionUrl('METRO_YELLOW_LINE_REGION'),
};

export const MAP_ASSETS = {
  bengaluruUrbanDistrict: publicUrl(`${GEOJSON_DIR}/bengaluru_urban_district.geojson`),
  transitStyle: publicUrl('/transit-style.json'),
  /** The pmtiles protocol reads the archive header itself to derive
   * min/max zoom, so it needs an absolute URL (with origin) — not just a
   * public-relative path. Computed lazily rather than at import time. */
  transitPmtiles: (): string => `${window.location.origin}${publicUrl('/assets/transit.pmtiles')}`,
} as const;
