import { circle, distance, difference, point, featureCollection, polygon, intersect, voronoi, bbox, buffer, pointToLineDistance, union, along, length, booleanPointInPolygon } from '@turf/turf';
import { Heading, Operation } from './geoTypes';
import { Feature, Point, Polygon, MultiPolygon, LineString, FeatureCollection, GeoJsonProperties } from 'geojson';

/**
 * Helper to compare coordinates with tolerance.
 */
const isClose = (c1: number[], c2: number[]) => {
    return Math.abs(c1[0] - c2[0]) < 1e-8 && Math.abs(c1[1] - c2[1]) < 1e-8;
};

/**
 * Calculates the distance between two points on the Earth's surface using Turf.js.
 * @param p1
 * @param p2
 * @returns distance in kilometers
 */
export const calculateDistance = (p1: Feature<Point> | number[], p2: Feature<Point> | number[]): number => {
    const from = Array.isArray(p1) ? point(p1) : p1;
    const to = Array.isArray(p2) ? point(p2) : p2;
    return distance(from, to, { units: 'kilometers' });
};

/**
 * Determines the relative heading of point 1 from point 2.
 * @param p1
 * @param p2
 * @returns heading object with lat and lon descriptors
 */
export const getRelativeHeading = (p1: Feature<Point> | number[], p2: Feature<Point> | number[]): Heading => {
    const c1 = Array.isArray(p1) ? p1 : p1.geometry.coordinates;
    const c2 = Array.isArray(p2) ? p2 : p2.geometry.coordinates;
    return {
        lat: c1[1] > c2[1] ? 'North' : 'South',
        lon: c1[0] > c2[0] ? 'East' : 'West'
    };
};

/**
 * Generates a circle polygon as a GeoJSON Feature.
 * @param center
 * @param radiusKm radius in kilometers
 * @param steps number of steps in the polygon (default 64)
 * @returns
 */
export const getCirclePolygon = (center: Feature<Point> | number[], radiusKm: number, steps = 64): Feature<Polygon> => {
    const centerPoint = Array.isArray(center) ? point(center) : center;
    return circle(centerPoint, radiusKm, { steps, units: 'kilometers' }) as Feature<Polygon>;
};

/**
 * Compute the difference between outer and hole
 * @param outerFeature
 * @param holeFeature
 * @returns
 */
export const differencePolygons = (outerFeature: Feature<Polygon | MultiPolygon>, holeFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    try {
        const diff = difference(featureCollection([outerFeature, holeFeature]));
        return (diff as Feature<Polygon | MultiPolygon>) || {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [] },
            properties: {}
        };
    } catch (e) {
        console.error("Difference failed", e);
        return {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [] },
            properties: {}
        };
    }
};

/**
 * Intersects two polygons or multipolygons.
 * @param f1
 * @param f2
 * @returns
 */
export const intersectPolygons = (f1: Feature<Polygon | MultiPolygon>, f2: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    try {
        const intersection = intersect(featureCollection([f1, f2]));
        return (intersection as Feature<Polygon | MultiPolygon>) || {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [] },
            properties: {}
        };
    } catch (e) {
        console.error("Intersection failed", e);
        return {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [] },
            properties: {}
        };
    }
};

/**
 * Split the polygon by direction, i.e. North, South, East, West.
 * @param pointFeature
 * @param direction 'North', 'South', 'East', or 'West'
 * @param playAreaFeature
 * @returns
 */
export const getSplitByDirectionPolygon = (pointFeature: Feature<Point>, direction: string, playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    const coords = pointFeature.geometry.coordinates;
    const [lng, lat] = coords;

    let b: [number, number, number, number];
    // The result should be the area WHERE THE HIDER IS.
    switch (direction) {
        case 'North':
            // Hider is North of lat
            b = [-180, lat, 180, 90];
            break;
        case 'South':
            // Hider is South of lat
            b = [-180, -90, 180, lat];
            break;
        case 'East':
            // Hider is East of lng
            b = [lng, -90, 180, 90];
            break;
        case 'West':
            // Hider is West of lng
            b = [-180, -90, lng, 90];
            break;
        default:
            b = [-180, -90, 180, 90];
    }

    const directionPolygon = polygon([[
        [b[0], b[1]],
        [b[2], b[1]],
        [b[2], b[3]],
        [b[0], b[3]],
        [b[0], b[1]]
    ]]);

    try {
        const intersection = intersect(featureCollection([playAreaFeature, directionPolygon]));
        return (intersection as Feature<Polygon | MultiPolygon>) || {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [] },
            properties: {}
        };
    } catch (e) {
        console.error("Intersection failed in split-by-direction", e);
        return playAreaFeature;
    }
};

/**
 * Generates a LineString representing the perpendicular bisector of p1-p2.
 * @param p1
 * @param p2
 * @param playAreaFeature
 * @returns
 */
export const getPerpendicularBisectorLine = (p1: number[], p2: number[], playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<LineString> => {
    try {
        const areaBbox = bbox(playAreaFeature);
        const pointsBbox = bbox(featureCollection([point(p1), point(p2)]));
        const combinedBbox: [number, number, number, number] = [
            Math.min(areaBbox[0], pointsBbox[0]) - 0.5,
            Math.min(areaBbox[1], pointsBbox[1]) - 0.5,
            Math.max(areaBbox[2], pointsBbox[2]) + 0.5,
            Math.max(areaBbox[3], pointsBbox[3]) + 0.5
        ];

        const pts = featureCollection([
            point(p1, { id: 'p1' }),
            point(p2, { id: 'p2' })
        ]);

        const voronoiCells = voronoi(pts, { bbox: combinedBbox });
        if (!voronoiCells || voronoiCells.features.length < 2) {
            throw new Error("Voronoi failed to generate 2 cells");
        }

        const c1 = voronoiCells.features[0]!.geometry.coordinates[0];
        const c2 = voronoiCells.features[1]!.geometry.coordinates[0];

        // Find common coordinates using tolerance
        const common = c1.filter(coord =>
            c2.some(c2Coord => isClose(coord, c2Coord))
        );

        if (common.length >= 2) {
            return {
                type: 'Feature' as const,
                geometry: {
                    type: 'LineString' as const,
                    coordinates: common
                },
                properties: { 'is-bisector': true }
            };
        }

        return {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: [] },
            properties: {}
        };
    } catch (e) {
        console.error("Bisector extraction failed", e);
        return {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: [] },
            properties: {}
        };
    }
};

/**
 * Generates a Feature<Polygon> representing the area to be SHADED for Hotter/Colder.
 * @param p1
 * @param p2
 * @param preferredPoint
 * @param playAreaFeature
 * @returns
 */
export const splitPolygonByTwoPoints = (p1: number[], p2: number[], preferredPoint: 'p1' | 'p2', playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    try {
        const areaBbox = bbox(playAreaFeature);
        const pointsBbox = bbox(featureCollection([point(p1), point(p2)]));
        const combinedBbox: [number, number, number, number] = [
            Math.min(areaBbox[0], pointsBbox[0]) - 0.5,
            Math.min(areaBbox[1], pointsBbox[1]) - 0.5,
            Math.max(areaBbox[2], pointsBbox[2]) + 0.5,
            Math.max(areaBbox[3], pointsBbox[3]) + 0.5
        ];

        const pts = featureCollection([
            point(p1, { id: 'p1' }),
            point(p2, { id: 'p2' })
        ]);

        const voronoiCells = voronoi(pts, { bbox: combinedBbox });
        if (!voronoiCells || voronoiCells.features.length < 2) {
            throw new Error("Voronoi failed");
        }

        const pointToShade = preferredPoint === 'p1' ? p2 : p1;

        // Find the cell to shade by matching the site ID
        let cellToShade = voronoiCells.features.find(f => {
            if (f && f.properties && f.properties.id) {
                // The Voronoi cell's id property contains the site identifier
                return f.properties.id === (preferredPoint === 'p1' ? 'p2' : 'p1');
            }
            return false;
        });

        if (!cellToShade) {
            // Fallback: find cell by sampling a point and checking distances
            cellToShade = voronoiCells.features.find(f => {
                if (f && f.geometry && f.geometry.coordinates && f.geometry.coordinates[0] && f.geometry.coordinates[0][0]) {
                    const samplePt = f.geometry.coordinates[0][0];
                    const d1 = distance(samplePt, p1);
                    const d2 = distance(samplePt, p2);
                    return (preferredPoint === 'p1') ? (d2 < d1) : (d1 < d2);
                }
                return false;
            }) || undefined;
        }

        if (!cellToShade) throw new Error("Cell not found");

        const result = intersect(featureCollection([playAreaFeature, cellToShade]));
        return (result as Feature<Polygon | MultiPolygon>) || {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [] },
            properties: {}
        };
    } catch (e) {
        console.error("Voronoi shading failed", e);
        return {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [] },
            properties: {}
        };
    }
};

/**
 * Splits a polygon based on whether points are closer or further from a MultiLineString
 * than a given seeker point.
 * @param seekerPoint 
 * @param multiLineString 
 * @param preference 'closer' or 'further'
 * @param selectedLineIndex index of the line in FeatureCollection
 * @param playAreaFeature 
 * @returns 
 */
export const splitPolygonByLineDistance = (seekerPoint: number[], multiLineString: any, preference: 'closer' | 'further', selectedLineIndex: number | undefined, playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    try {
        const p = point(seekerPoint);

        // Ensure we have a Feature or Geometry suitable for pointToLineDistance
        let lineFeature: any = multiLineString;
        if (multiLineString.type === 'FeatureCollection' && multiLineString.features.length > 0) {
            lineFeature = multiLineString.features[selectedLineIndex !== undefined ? selectedLineIndex : 0]; // Take selected or first
        }

        const d = pointToLineDistance(p, lineFeature, { units: 'kilometers' });

        // Create a buffer around the line with radius d
        // We use a slightly large number of steps for smoothness
        const lineBuffer = buffer(lineFeature, d, { units: 'kilometers', steps: 64 }) as Feature<Polygon | MultiPolygon>;

        if (preference === 'closer') {
            // Hider is closer than seeker -> Hider is inside the buffer
            return intersectPolygons(playAreaFeature, lineBuffer);
        } else {
            // Hider is further than seeker -> Hider is outside the buffer
            return differencePolygons(playAreaFeature, lineBuffer);
        }
    } catch (e) {
        console.error("Split by line distance failed", e);
        return playAreaFeature;
    }
};



/**
 * Finds the first polygon or multipolygon in a GeoJSON that contains the given point.
 * @param pt 
 * @param geojson 
 * @returns 
 */
export const findContainingPolygon = (pt: number[], geojson: any): Feature<Polygon | MultiPolygon> | null => {
    if (!geojson) return null;

    const p = point(pt);
    let foundFeature: Feature<Polygon | MultiPolygon> | null = null;

    const processItem = (item: any) => {
        if (foundFeature) return;
        if (item.type === 'Feature') {
            if (item.geometry.type === 'Polygon' || item.geometry.type === 'MultiPolygon') {
                if (booleanPointInPolygon(p, item)) {
                    foundFeature = item;
                }
            }
        } else if (item.type === 'FeatureCollection') {
            for (const f of item.features) {
                processItem(f);
                if (foundFeature) break;
            }
        } else if (item.type === 'Polygon' || item.type === 'MultiPolygon') {
            if (booleanPointInPolygon(p, item)) {
                foundFeature = { type: 'Feature', geometry: item, properties: {} };
            }
        }
    };

    processItem(geojson);
    return foundFeature;
};

/**
 * Global World Polygon for default shading/play area.
 */
export const globalWorld: Feature<Polygon> = {
    type: 'Feature',
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
        ]]
    },
    properties: {}
};

/**
 * Applies a single geometric operation to an area.
 * @param op 
 * @param area 
 * @returns 
 */
export const applySingleOperation = (op: Operation, area: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    if (op.type === 'draw-circle' && op.points.length > 0) {
        const centerFeature = {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: op.points[0] },
            properties: {}
        };
        const circleFeature = getCirclePolygon(centerFeature, op.radius || 0);
        if (op.hiderLocation === 'inside') {
            return intersectPolygons(area, circleFeature);
        }
        return differencePolygons(area, circleFeature);
    }

    if (op.type === 'split-by-direction' && op.points.length > 0) {
        const pointFeature = {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: op.points[0] },
            properties: {}
        };
        return getSplitByDirectionPolygon(pointFeature, op.splitDirection || 'North', area);
    }

    if (op.type === 'hotter-colder' && op.points.length === 2) {
        const shadedArea = splitPolygonByTwoPoints(op.points[0], op.points[1], op.preferredPoint || 'p1', area);
        return differencePolygons(area, shadedArea);
    }

    if (op.type === 'areas' && op.uploadedArea) {
        let uploadedFeature: Feature<Polygon | MultiPolygon> | null = null;
        const ua = op.uploadedArea;
        if (ua.type === 'Feature' && (ua.geometry.type === 'Polygon' || ua.geometry.type === 'MultiPolygon')) {
            uploadedFeature = ua;
        } else if (ua.type === 'Polygon' || ua.type === 'MultiPolygon') {
            uploadedFeature = { type: 'Feature', geometry: ua, properties: {} };
        } else if (ua.type === 'FeatureCollection') {
            const idx = op.selectedLineIndex !== undefined ? op.selectedLineIndex : 0;
            const polyFeature = ua.features[idx];
            if (polyFeature && polyFeature.geometry && (polyFeature.geometry.type === 'Polygon' || polyFeature.geometry.type === 'MultiPolygon')) {
                uploadedFeature = polyFeature;
            }
        }

        if (uploadedFeature) {
            if (op.areaOpType === 'inside') {
                return intersectPolygons(area, uploadedFeature);
            } else {
                return differencePolygons(area, uploadedFeature);
            }
        }
    }

    if (op.type === 'closer-to-line' && op.points.length > 0 && op.multiLineString) {
        return splitPolygonByLineDistance(op.points[0], op.multiLineString, op.closerFurther || 'closer', op.selectedLineIndex, area);
    }



    if (op.type === 'polygon-location' && op.points.length > 0 && op.polygonGeoJSON) {
        const found = findContainingPolygon(op.points[0], op.polygonGeoJSON);
        if (found) {
            return intersectPolygons(area, found);
        } else {
            // User outside all polygons -> return empty area
            return {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [] },
                properties: {}
            };
        }
    }

    return area;
};

/**
 * Computes the final hider area by applying a sequence of operations to a starting area.
 * @param playArea 
 * @param operations 
 * @returns 
 */
export const computeHiderArea = (playArea: any, operations: Operation[]): Feature<Polygon | MultiPolygon> => {
    let currentArea: Feature<Polygon | MultiPolygon> | null = null;

    if (playArea) {
        if (playArea.type === 'Feature' && (playArea.geometry.type === 'Polygon' || playArea.geometry.type === 'MultiPolygon')) {
            currentArea = playArea;
        } else if (playArea.type === 'Polygon' || playArea.type === 'MultiPolygon') {
            currentArea = { type: 'Feature', geometry: playArea, properties: {} };
        } else if (playArea.type === 'FeatureCollection') {
            const polyFeature = playArea.features.find((f: any) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
            if (polyFeature) currentArea = polyFeature;
        }
    }

    if (!currentArea) {
        currentArea = globalWorld;
    }

    operations.forEach(op => {
        if (currentArea) {
            currentArea = applySingleOperation(op, currentArea);
        }
    });

    return currentArea;
};
