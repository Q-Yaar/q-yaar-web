/**
 * Geographic utility functions for question automation
 * All coordinates are in { lat: number, lon: number } format (decimal degrees)
 * Distances are in meters
 */

interface Coord {
  lat: number;
  lon: number;
}

// Export the interface
export type { Coord };

/**
 * Earth's radius in meters
 */
const EARTH_RADIUS = 6371000;

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

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function haversine(a: Coord, b: Coord): number {
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const Δφ = (b.lat - a.lat) * Math.PI / 180;
  const Δλ = (b.lon - a.lon) * Math.PI / 180;

  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);
  
  const a_val = sinΔφ * sinΔφ + 
               Math.cos(φ1) * Math.cos(φ2) * 
               sinΔλ * sinΔλ;
  const c = 2 * Math.atan2(Math.sqrt(a_val), Math.sqrt(1 - a_val));
  
  return EARTH_RADIUS * c;
}

/**
 * Calculate bearing (direction) from point A to point B
 * Returns bearing in degrees (0-360), where 0 is north
 */
export function bearing(a: Coord, b: Coord): number {
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const λ1 = a.lon * Math.PI / 180;
  const λ2 = b.lon * Math.PI / 180;

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - 
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  
  let θ = Math.atan2(y, x);
  θ = θ * 180 / Math.PI;
  
  // Normalize to 0-360
  return (θ + 360) % 360;
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * @param point - The point to check
 * @param polygon - Array of vertices defining the polygon (must be closed or will be closed automatically)
 */
export function pointInPolygon(point: Coord, polygon: Coord[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  
  // Ensure polygon is closed (first and last point are the same)
  const closedPolygon = [...polygon];
  if (polygon[0].lat !== polygon[polygon.length - 1].lat || 
      polygon[0].lon !== polygon[polygon.length - 1].lon) {
    closedPolygon.push(polygon[0]);
  }
  
  for (let i = 0, j = closedPolygon.length - 1; i < closedPolygon.length; j = i++) {
    const xi = closedPolygon[i].lon;
    const yi = closedPolygon[i].lat;
    const xj = closedPolygon[j].lon;
    const yj = closedPolygon[j].lat;

    // Check if point is on the edge
    const onEdge = pointOnLineSegment(point, { lat: yi, lon: xi }, { lat: yj, lon: xj });
    if (onEdge) return true;

    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lon < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Check if a point is on a line segment (with tolerance for floating point)
 */
function pointOnLineSegment(p: Coord, a: Coord, b: Coord, tolerance: number = 1e-6): boolean {
  // Check if point is close to the line
  const crossProduct = (p.lon - a.lon) * (b.lat - a.lat) - (p.lat - a.lat) * (b.lon - a.lon);
  if (Math.abs(crossProduct) > tolerance) return false;
  
  // Check if point is within the bounding box
  const minLon = Math.min(a.lon, b.lon);
  const maxLon = Math.max(a.lon, b.lon);
  const minLat = Math.min(a.lat, b.lat);
  const maxLat = Math.max(a.lat, b.lat);
  
  return p.lon >= minLon - tolerance && 
         p.lon <= maxLon + tolerance &&
         p.lat >= minLat - tolerance && 
         p.lat <= maxLat + tolerance;
}

/**
 * Check if a point is inside a circle
 * @param point - The point to check
 * @param center - Center of the circle
 * @param radius - Radius in meters
 */
export function pointInCircle(point: Coord, center: Coord, radius: number): boolean {
  const distance = haversine(point, center);
  return distance <= radius;
}

/**
 * Check if a point is within a minimum and maximum distance from a center
 * @param point - The point to check
 * @param center - Center point
 * @param minDistance - Minimum distance in meters (inclusive)
 * @param maxDistance - Maximum distance in meters (inclusive)
 */
export function pointInAnnulus(point: Coord, center: Coord, minDistance: number, maxDistance: number): boolean {
  const distance = haversine(point, center);
  return distance >= minDistance && distance <= maxDistance;
}

/**
 * Extract all coordinates from a question's metadata and rendered question
 */
export function extractAllCoordsFromQuestion(question: any): Coord[] {
  const coords: Coord[] = [];
  
  // Extract from rendered question text
  const textCoordPattern = /(-?\d+\.?\d+)\s*,\s*(-?\d+\.?\d+)/g;
  let match;
  const text = question.rendered_question || '';
  while ((match = textCoordPattern.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      coords.push({ lat, lon });
    }
  }
  
  // Extract from question_meta.location_points
  if (question.question_meta?.location_points) {
    for (const point of question.question_meta.location_points) {
      const parsed = parseLocationPoint(point);
      if (parsed) coords.push(parsed);
    }
  }
  
  // Extract from question_meta.myLocation
  if (question.question_meta?.myLocation) {
    const parsed = parseCoord(question.question_meta.myLocation);
    if (parsed) coords.push(parsed);
  }
  
  // Extract from question_meta.hidingLocation
  if (question.question_meta?.hidingLocation) {
    const parsed = parseCoord(question.question_meta.hidingLocation);
    if (parsed) coords.push(parsed);
  }
  
  // Extract from question_meta.center
  if (question.question_meta?.center) {
    const parsed = parseCoord(question.question_meta.center);
    if (parsed) coords.push(parsed);
  }
  
  // Extract from question_meta.target
  if (question.question_meta?.target) {
    const parsed = parseCoord(question.question_meta.target);
    if (parsed) coords.push(parsed);
  }
  
  // Extract from polygon vertices
  if (question.question_meta?.polygon_vertices) {
    for (const vertex of question.question_meta.polygon_vertices) {
      const parsed = parseCoord(vertex);
      if (parsed) coords.push(parsed);
    }
  }
  
  return coords;
}
