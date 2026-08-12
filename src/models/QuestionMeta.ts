/**
 * Question Metadata Types
 * 
 * This file defines typed metadata structures for different question categories,
 * ensuring type safety and clarity across both QnA and geo modules.
 * 
 * For geo-type questions, the metadata is explicitly typed to make it clear
 * what data is required and what each field represents.
 * 
 * Note: All fields are optional in the interfaces because we do runtime validation
 * in the handlers. The comments indicate which fields are required for each category.
 */

import { Coord } from '../utils/geo';

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * A geographic coordinate point
 * Used consistently across all location-based metadata
 */
export interface LocationPoint {
  lat: string;
  lon: string;
}

/**
 * Base type for all question metadata
 * Contains common fields that may appear across multiple categories
 */
export interface BaseQuestionMeta {
  // Common location fields with explicit semantic names
  seekerLocation?: LocationPoint;    // Location of the seeking/asking user
  hiderLocation?: LocationPoint;    // Location of the hiding user
  targetLocation?: LocationPoint;    // Target reference location
  
  // Generic points array for categories that need multiple arbitrary points
  // Use this only when points don't have specific semantic meaning
  location_points?: LocationPoint[];
}

// ============================================================================
// GEO QUESTION CATEGORY METADATA
// ============================================================================

/**
 * Metadata for "Measuring" category questions
 * Example: "Compared to me, are you closer to or further from [target]?"
 * Requires: seeker location, hiding location, and target location
 */
export interface MeasuringQuestionMeta extends BaseQuestionMeta {
  // All three locations are explicitly named (checked at runtime)
  seekerLocation?: LocationPoint;
  hiderLocation?: LocationPoint;
  targetLocation?: LocationPoint;
}

/**
 * Metadata for "Polygon Location" category questions
 * Example: "Is the target inside the defined polygon?"
 * Requires: polygon vertices and a target point
 */
export interface PolygonLocationQuestionMeta extends BaseQuestionMeta {
  polygon_vertices?: LocationPoint[];  // Array of vertices defining the polygon
  targetLocation?: LocationPoint;    // Point to check against the polygon
}

/**
 * Metadata for "Distance" category questions
 * Example: "Are the two points within X meters of each other?"
 * Requires: at least two location points and optionally a threshold
 */
export interface DistanceQuestionMeta extends BaseQuestionMeta {
  location_points?: LocationPoint[]; // At least 2 points
  distance_threshold?: number;      // Optional: maximum allowed distance in meters
}

/**
 * Metadata for "Circle" category questions
 * Example: "Is the target inside the circle?"
 * Requires: center point, radius, and target point
 */
export interface CircleQuestionMeta extends BaseQuestionMeta {
  center?: LocationPoint;           // Center of the circle
  radius?: number;                 // Radius in meters
  targetLocation?: LocationPoint; // Point to check against the circle
}

/**
 * Metadata for "Heading" and "Relative Heading" category questions
 * Example: "What direction is the target relative to me?"
 * Requires: reference location (seeker) and target location
 */
export interface HeadingQuestionMeta extends BaseQuestionMeta {
  seekerLocation?: LocationPoint;  // Reference point for bearing calculation
  targetLocation?: LocationPoint; // Target point
  hiderLocation?: LocationPoint;  // Optional: for comparing against hider's direction
}

/**
 * Metadata for "Hotter/Colder" category questions
 * Example: "Am I getting closer to or further from the target?"
 * Requires: previous location, current location, and target location
 */
export interface HotterColderQuestionMeta extends BaseQuestionMeta {
  previousLocation?: LocationPoint; // Seeker's previous position
  currentLocation?: LocationPoint;  // Seeker's current position
  targetLocation?: LocationPoint;  // Target being sought
}

/**
 * Metadata for "Area Operations" category questions
 * Can be either polygon-based or circle-based
 */
export interface AreaOperationsQuestionMeta extends BaseQuestionMeta {
  // Either polygon or circle definition
  polygon_vertices?: LocationPoint[];
  center?: LocationPoint;
  radius?: number;
  
  // Plus target to check
  targetLocation?: LocationPoint;
}

/**
 * Metadata for "Closer to Line" category questions
 * Example: "Am I closer to the metro line than the target?"
 */
export interface CloserToLineQuestionMeta extends BaseQuestionMeta {
  line_points?: LocationPoint[];      // Array of points defining the line (at least 2)
  targetLocation?: LocationPoint;    // Point to compare against
  seekerLocation?: LocationPoint;    // Current seeker position
}

// ============================================================================
// NON-GEO QUESTION CATEGORY METADATA
// ============================================================================

/**
 * Metadata for "Text Fact" category questions
 * Example: "Is this statement true?"
 */
export interface TextFactQuestionMeta extends BaseQuestionMeta {
  expected_answer?: boolean | string; // Pre-determined answer if known
  fact_text?: string;               // The factual statement being verified
}

/**
 * Metadata for "Photo", "Video", "Image", "Picture", "Capture" categories
 * These are manual-only and typically don't have automated metadata
 */
export interface MediaQuestionMeta extends BaseQuestionMeta {
  media_url?: string;              // URL to the uploaded media
  media_type?: 'photo' | 'video' | 'image' | 'picture' | 'capture';
  caption?: string;
}

/**
 * Metadata for "Subjective" and "Opinion" categories
 * These are manual-only and don't have structured metadata
 */
export interface SubjectiveQuestionMeta extends BaseQuestionMeta {
  // No specific structure - free-form if needed
  notes?: string;
}

// ============================================================================
// UNION TYPE AND TYPE GUARDS
// ============================================================================

/**
 * All possible question metadata types, keyed by category name
 * This allows type-safe access based on the question's category
 */
export type QuestionMetaByCategory = {
  'Measuring': MeasuringQuestionMeta;
  'Polygon Location': PolygonLocationQuestionMeta;
  'Distance': DistanceQuestionMeta;
  'Circle': CircleQuestionMeta;
  'Heading': HeadingQuestionMeta;
  'Relative Heading': HeadingQuestionMeta;
  'Hotter/Colder': HotterColderQuestionMeta;
  'Hotter / Colder': HotterColderQuestionMeta;
  'Area Operations': AreaOperationsQuestionMeta;
  'closer-to-line': CloserToLineQuestionMeta;
  'Text Fact': TextFactQuestionMeta;
  'Photo': MediaQuestionMeta;
  'Video': MediaQuestionMeta;
  'Image': MediaQuestionMeta;
  'Picture': MediaQuestionMeta;
  'Capture': MediaQuestionMeta;
  'Subjective': SubjectiveQuestionMeta;
  'Opinion': SubjectiveQuestionMeta;
};

/**
 * Extract the metadata type for a specific category
 * Usage: type Meta = QuestionMetaForCategory<'Measuring'>; // MeasuringQuestionMeta
 */
export type QuestionMetaForCategory<C extends keyof QuestionMetaByCategory> = 
  QuestionMetaByCategory[C];

/**
 * Type guard to check if a question belongs to a specific category
 * Note: This only checks the category name, not the metadata structure.
 * Runtime validation of metadata fields is still required in the handlers.
 * 
 * Usage: if (isCategory(question, 'Measuring')) { ... }
 */
export function isCategory<C extends keyof QuestionMetaByCategory>(
  question: { category: { category_name: string } },
  category: C
): question is { category: { category_name: C } } {
  return question.category.category_name === category;
}

// ============================================================================
// UTILITY TYPES FOR BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Loose question metadata type for cases where we don't know the category
 * Maintains backward compatibility with existing code
 */
export type UnknownQuestionMeta = BaseQuestionMeta & {
  [key: string]: unknown;
};

/**
 * Helper to extract coordinates from any metadata type
 * Works with both typed and untyped metadata
 */
export function getLocationFromMeta(
  meta: BaseQuestionMeta | UnknownQuestionMeta | any,
  field: keyof BaseQuestionMeta
): Coord | null {
  const point = meta[field as keyof typeof meta] as LocationPoint | undefined;
  if (!point) return null;
  return {
    lat: parseFloat(point.lat),
    lon: parseFloat(point.lon),
  };
}

/**
 * Helper to extract all coordinates from metadata
 * Works with location_points array
 */
export function getAllCoordsFromMeta(
  meta: BaseQuestionMeta | UnknownQuestionMeta | any
): Coord[] {
  const points: LocationPoint[] = meta.location_points || [];
  return points.map(p => ({
    lat: parseFloat(p.lat),
    lon: parseFloat(p.lon),
  }));
}

// ============================================================================
// FACT METADATA (for automation)
// ============================================================================

/**
 * Metadata for fact-based automation
 * This contains category-specific fields that are used by the automation system
 * to compute answers automatically.
 * 
 * Matches the backend's AnswerInstructionMeta structure.
 */
export interface FactMeta {
  points?: LocationPoint[];           // Array of points for various purposes
  radius?: string;                   // Radius for circle-based questions
  hider_location?: string;           // inside/outside for polygon location
  split_direction?: string;          // north/south/east/west for area operations
  preferred_point?: string;          // p1/p2 for polygon location
  area_op_type?: string;             // inside/outside for area operations
  uploaded_area?: string;            // Uploaded area identifier
  text?: string;                     // Text for text-based facts
  closer_further?: string;           // closer/further for hotter/colder
  selected_line_index?: number;      // Selected line index for closer-to-line
  polygon_geo_json?: any;            // GeoJSON for polygon
  feature_name?: string;             // Feature name for fact identification
}
