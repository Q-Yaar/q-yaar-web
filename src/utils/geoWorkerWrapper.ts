// Wrapper for managing the geo worker
import { wrap } from 'comlink';

// Type for the worker API
interface GeoWorkerAPI {
    computeHiderArea: (playArea: any, operations: any[]) => Promise<any>;
    applySingleOperation: (op: any, area: any) => Promise<any>;
    getCirclePolygon: (center: any, radiusKm: number, steps?: number) => Promise<any>;
    differencePolygons: (outerFeature: any, holeFeature: any) => Promise<any>;
    intersectPolygons: (f1: any, f2: any) => Promise<any>;
    getSplitByDirectionPolygon: (pointFeature: any, direction: string, playAreaFeature: any) => Promise<any>;
    getPerpendicularBisectorLine: (p1: number[], p2: number[], playAreaFeature: any) => Promise<any>;
    splitPolygonByTwoPoints: (p1: number[], p2: number[], preferredPoint: 'p1' | 'p2', playAreaFeature: any) => Promise<any>;
    splitPolygonByLineDistance: (seekerPoint: number[], multiLineString: any, preference: 'closer' | 'further', selectedLineIndex: number | undefined, playAreaFeature: any) => Promise<any>;
    findContainingPolygon: (pt: number[], geojson: any) => Promise<any>;
}

let workerPromise: Promise<GeoWorkerAPI> | null = null;

const getGeoWorker = async (): Promise<GeoWorkerAPI> => {
    if (!workerPromise) {
        // Create worker only in browser environment
        if (typeof window !== 'undefined') {
            // Create a worker from the TS file - in production this will be a compiled JS file
            const worker = new Worker(new URL('./geoWorker.ts', import.meta.url));
            workerPromise = wrap<GeoWorkerAPI>(worker);
        } else {
            // Fallback for SSR or testing - import the functions directly
            const { 
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
            } = await import('./geoUtils');
            
            // Wrap the synchronous functions to return promises to match the worker API
            const asyncFunctions = {
                computeHiderArea: (playArea: any, operations: any[]) => Promise.resolve(computeHiderArea(playArea, operations)),
                applySingleOperation: (op: any, area: any) => Promise.resolve(applySingleOperation(op, area)),
                getCirclePolygon: (center: any, radiusKm: number, steps?: number) => Promise.resolve(getCirclePolygon(center, radiusKm, steps)),
                differencePolygons: (outerFeature: any, holeFeature: any) => Promise.resolve(differencePolygons(outerFeature, holeFeature)),
                intersectPolygons: (f1: any, f2: any) => Promise.resolve(intersectPolygons(f1, f2)),
                getSplitByDirectionPolygon: (pointFeature: any, direction: string, playAreaFeature: any) => Promise.resolve(getSplitByDirectionPolygon(pointFeature, direction, playAreaFeature)),
                getPerpendicularBisectorLine: (p1: number[], p2: number[], playAreaFeature: any) => Promise.resolve(getPerpendicularBisectorLine(p1, p2, playAreaFeature)),
                splitPolygonByTwoPoints: (p1: number[], p2: number[], preferredPoint: 'p1' | 'p2', playAreaFeature: any) => Promise.resolve(splitPolygonByTwoPoints(p1, p2, preferredPoint, playAreaFeature)),
                splitPolygonByLineDistance: (seekerPoint: number[], multiLineString: any, preference: 'closer' | 'further', selectedLineIndex: number | undefined, playAreaFeature: any) => Promise.resolve(splitPolygonByLineDistance(seekerPoint, multiLineString, preference, selectedLineIndex, playAreaFeature)),
                findContainingPolygon: (pt: number[], geojson: any) => Promise.resolve(findContainingPolygon(pt, geojson))
            };
            workerPromise = Promise.resolve(asyncFunctions);
        }
    }
    return workerPromise!;
};

const resetWorker = () => {
    workerPromise = null;
};

export { getGeoWorker, resetWorker };
export type { GeoWorkerAPI };