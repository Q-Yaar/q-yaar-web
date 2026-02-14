import { Operation, OperationType } from './geoTypes';
import { Fact, FactInfo } from '../models/Fact';

/**
 * Converts a backend Fact (GEO type) to an Operation used by the Map UI.
 */
export const convertBackendFactToOperation = (fact: Fact): Operation | null => {
    if (fact.fact_type !== 'GEO') return null;

    const info = fact.fact_info;

    // Extract operation type and parameters from fact_info
    const operationType = info.operation as OperationType;
    if (!operationType) return null;

    const op: Operation = {
        id: fact.fact_id,
        type: operationType,
        points: info.points || [],
        radius: info.radius,
        hiderLocation: info.hiderLocation,
        splitDirection: info.splitDirection,
        preferredPoint: info.preferredPoint,
        areaOpType: info.areaOpType,
        uploadedArea: info.uploadedArea,
        multiLineString: info.multiLineString,
        closerFurther: info.closerFurther,
        selectedLineIndex: info.selectedLineIndex,
        polygonGeoJSON: info.polygonGeoJSON,
        timestamp: new Date(fact.created).getTime()
    };

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
        operation: op.type,
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
