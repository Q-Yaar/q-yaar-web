import { Operation, OperationType } from './geoTypes';
import { Fact, FactInfo } from '../models/Fact';

/**
 * Normalize a fact's points into the [lng, lat] number[][] format the geo
 * worker expects. Facts created manually via the map already store [lng, lat]
 * arrays, but facts created from asked questions store {lat, lon} objects
 * (with string values), so we coerce both shapes here.
 */
const normalizePoints = (raw: any): number[][] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((p: any) => {
            if (Array.isArray(p)) {
                return [Number(p[0]), Number(p[1])];
            }
            if (p && typeof p === 'object' && 'lat' in p && 'lon' in p) {
                return [Number(p.lon), Number(p.lat)];
            }
            return null;
        })
        .filter((p: number[] | null): p is number[] => p !== null && !Number.isNaN(p[0]) && !Number.isNaN(p[1]));
};

/**
 * Normalize a splitDirection value to the capitalized form ('North'/'South'/
 * 'East'/'West') that getSplitByDirectionPolygon switches on. Facts created
 * from asked questions store the lowercase placeholder value (e.g. 'north'),
 * which would otherwise fall through to the default branch and return the
 * whole world instead of splitting.
 */
const normalizeDirection = (d: string): 'North' | 'South' | 'East' | 'West' | undefined => {
    if (!d) return undefined;
    const cap = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
    return cap === 'North' || cap === 'South' || cap === 'East' || cap === 'West' ? cap : undefined;
};

/**
 * Converts a backend Fact (GEO type) to an Operation used by the Map UI.
 */
export const convertBackendFactToOperation = (fact: Fact): Operation | null => {
    if (fact.fact_type !== 'GEO') return null;

    const info = fact.fact_info;

    // Extract operation type and parameters from fact_info
    // Note: operation type is stored as op_type in the fact_info
    // and operation parameters are stored in op_meta
    const operationType = info.op_type as OperationType;
    if (!operationType) {
        console.log('No operation type found in fact:', fact);
        return null;
    }

    const opMeta = info.op_meta || {};
    console.log('Converting fact to operation:', {
        factId: fact.fact_id,
        operationType,
        opMeta,
        info
    });

    const op: Operation = {
        id: fact.fact_id,
        type: operationType,
        points: normalizePoints(opMeta.points),
        radius: opMeta.radius,
        hiderLocation: opMeta.hiderLocation,
        splitDirection: normalizeDirection(opMeta.splitDirection),
        preferredPoint: opMeta.preferredPoint,
        areaOpType: opMeta.areaOpType,
        uploadedArea: opMeta.uploadedArea,
        multiLineString: opMeta.multiLineString,
        closerFurther: opMeta.closerFurther,
        selectedLineIndex: opMeta.selectedLineIndex,
        polygonGeoJSON: opMeta.polygonGeoJSON,
        timestamp: new Date(fact.created).getTime()
    };

    console.log('Converted operation:', op);
    return op;
};

/**
 * Converts an Operation to a backend Fact for creation/update.
 */
export const convertOperationToFactInfo = (op: Operation, isPlayArea: boolean = false): FactInfo => {
    if (isPlayArea) {
        return {
            operation: 'play-area',
            playArea: op // op is the playArea GeoJSON object here
        };
    }

    return {
        points: op.points,
        radius: op.radius,
        hiderLocation: op.hiderLocation,
        splitDirection: op.splitDirection,
        preferredPoint: op.preferredPoint,
        areaOpType: op.areaOpType,
        uploadedArea: op.uploadedArea,
        multiLineString: op.multiLineString,
        closerFurther: op.closerFurther,
        selectedLineIndex: op.selectedLineIndex,
        polygonGeoJSON: op.polygonGeoJSON
    };
};
