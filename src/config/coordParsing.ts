/**
 * Coordinate Parsing Utilities
 *
 * Pure coordinate parsing helpers extracted from questionCategoryHandlers to
 * avoid a circular import (questionCategories.config -> handlerFactory ->
 * questionCategoryHandlers -> questionCategories.config). Keep this module
 * free of imports back into the config/handler modules.
 */

import type { Coord } from '../utils/geoTypes';

/**
 * Parse a coordinate string into a Coord object
 * Accepts formats like "12.9427, 77.5694" or "12.9427,77.5694"
 */
export function parseCoord(input: string | undefined): Coord | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // Handle array-like format from location_points: { lat: string, lon: string }
  if (typeof input === 'object' && input !== null && 'lat' in input && 'lon' in input) {
    const lat = parseFloat((input as any).lat);
    const lon = parseFloat((input as any).lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon };
    }
    return null;
  }

  // Match "lat,lon" or "lat, lon" pattern
  const match = trimmed.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon };
    }
  }

  return null;
}

/**
 * Parse a coordinate from a location point object { lat: string, lon: string }
 */
export function parseLocationPoint(point: { lat: string; lon: string } | undefined): Coord | null {
  if (!point) return null;
  const lat = parseFloat(point.lat);
  const lon = parseFloat(point.lon);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}
