// Web Worker for expensive geometric computations
import { expose } from 'comlink';
import { Feature, Point, Polygon, MultiPolygon, LineString, FeatureCollection, GeoJsonProperties } from 'geojson';
import { circle, distance, difference, point, featureCollection, polygon, intersect, voronoi, bbox, buffer, pointToLineDistance, union, along, length, booleanPointInPolygon } from '@turf/turf';

// Helper to compare coordinates with tolerance
const isClose = (c1: number[], c2: number[]) => {
    return Math.abs(c1[0] - c2[0]) < 1e-8 && Math.abs(c1[1] - c2[1]) < 1e-8;
};

// Global World Polygon for default shading/play area
const globalWorld: Feature<Polygon> = {
    type: 'Feature',
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
        ]]
    },
    properties: {}
};

// Type definitions for Operation
interface Operation {
    id: string;
    type: string;
    points: number[][];
    radius?: number;
    hiderLocation?: 'inside' | 'outside';
    splitDirection?: 'North' | 'South' | 'East' | 'West';
    preferredPoint?: 'p1' | 'p2';
    areaOpType?: 'inside' | 'outside';
    uploadedArea?: any;
    multiLineString?: any;
    closerFurther?: 'closer' | 'further';
    selectedLineIndex?: number;
    polygonGeoJSON?: any;
    featureName?: string;
}

const getCirclePolygon = (center: Feature<Point> | number[], radiusKm: number, steps = 64): Feature<Polygon> => {
    const centerPoint = Array.isArray(center) ? point(center) : center;
    return circle(centerPoint, radiusKm, { steps, units: 'kilometers' }) as Feature<Polygon>;
};

const differencePolygons = (outerFeature: Feature<Polygon | MultiPolygon>, holeFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
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

const intersectPolygons = (f1: Feature<Polygon | MultiPolygon>, f2: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
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

const getSplitByDirectionPolygon = (pointFeature: Feature<Point>, direction: string, playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    const coords = pointFeature.geometry.coordinates;
    const [lng, lat] = coords;

    let b: [number, number, number, number];
    switch (direction) {
        case 'North':
            b = [-180, lat, 180, 90];
            break;
        case 'South':
            b = [-180, -90, 180, lat];
            break;
        case 'East':
            b = [lng, -90, 180, 90];
            break;
        case 'West':
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

const getPerpendicularBisectorLine = (p1: number[], p2: number[], playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<LineString> => {
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

const splitPolygonByTwoPoints = (p1: number[], p2: number[], preferredPoint: 'p1' | 'p2', playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
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

        let cellToShade = voronoiCells.features.find(f => {
            if (f && f.properties && f.properties.id) {
                return f.properties.id === (preferredPoint === 'p1' ? 'p2' : 'p1');
            }
            return false;
        });

        if (!cellToShade) {
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

const splitPolygonByLineDistance = (seekerPoint: number[], multiLineString: any, preference: 'closer' | 'further', selectedLineIndex: number | undefined, playAreaFeature: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
    try {
        const p = point(seekerPoint);

        let lineFeature: any = multiLineString;
        if (multiLineString.type === 'FeatureCollection' && multiLineString.features.length > 0) {
            lineFeature = multiLineString.features[selectedLineIndex !== undefined ? selectedLineIndex : 0];
        }

        const d = pointToLineDistance(p, lineFeature, { units: 'kilometers' });

        const lineBuffer = buffer(lineFeature, d, { units: 'kilometers', steps: 64 }) as Feature<Polygon | MultiPolygon>;

        if (preference === 'closer') {
            return intersectPolygons(playAreaFeature, lineBuffer);
        } else {
            return differencePolygons(playAreaFeature, lineBuffer);
        }
    } catch (e) {
        console.error("Split by line distance failed", e);
        return playAreaFeature;
    }
};

const findContainingPolygon = (pt: number[], geojson: any): Feature<Polygon | MultiPolygon> | null => {
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

const applySingleOperation = (op: Operation, area: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon> => {
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
            return {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [] },
                properties: {}
            };
        }
    }

    return area;
};

const computeHiderArea = (playArea: any, operations: Operation[]): Feature<Polygon | MultiPolygon> => {
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

// Expose the functions to be used by the main thread
expose({
    computeHiderArea,
    applySingleOperation,
    getCirclePolygon,
    differencePolygons,
    intersectPolygons,
    getSplitByDirectionPolygon,
    getPerpendicularBisectorLine,
    splitPolygonByTwoPoints,
    splitPolygonByLineDistance,
    findContainingPolygon
});