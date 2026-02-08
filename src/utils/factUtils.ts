import { Fact, Operation, OperationType } from './geoTypes';

/**
 * Converts a Fact from the backend schema to an Operation used by the Map UI.
 */
export const convertFactToOperation = (fact: Fact): Operation | null => {
    if (fact.type !== 'map' || !fact.operation) return null;

    const op: Operation = {
        id: fact.id,
        type: fact.operation as OperationType,
        points: fact.parameters?.points || [],
        radius: fact.parameters?.radius,
        hiderLocation: fact.parameters?.hiderLocation,
        splitDirection: fact.parameters?.splitDirection,
        preferredPoint: fact.parameters?.preferredPoint,
        areaOpType: fact.parameters?.areaOpType,
        uploadedArea: fact.parameters?.uploadedArea,
        multiLineString: fact.parameters?.multiLineString,
        closerFurther: fact.parameters?.closerFurther,
        selectedLineIndex: fact.parameters?.selectedLineIndex,
        polygonGeoJSON: fact.parameters?.polygonGeoJSON,
        timestamp: fact.timestamp
    };

    return op;
};

/**
 * Converts an Operation or Play Area data to a Fact for the backend.
 */
export const convertOperationToFact = (op: Operation | any, gameId: string, teamId: string, isPlayArea: boolean = false): Fact => {
    if (isPlayArea) {
        return {
            id: 'fact-play-area',
            gameId,
            teamId,
            type: 'map',
            timestamp: Date.now(),
            operation: 'play-area',
            parameters: {
                playArea: op // op is the playArea GeoJSON object here
            }
        };
    }

    return {
        id: op.id,
        gameId,
        teamId,
        type: 'map',
        timestamp: op.timestamp || Date.now(),
        operation: op.type,
        parameters: {
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
        }
    };
};

/**
 * Merges two lists of facts based on Fact ID and Timestamp.
 * If IDs match, the fact with the higher timestamp wins.
 */
export const mergeFacts = (local: Fact[], remote: Fact[]): Fact[] => {
    const factMap = new Map<string, Fact>();

    // Add all local facts to the map
    local.forEach(f => factMap.set(f.id, f));

    // Merge remote facts
    remote.forEach(remoteFact => {
        const existing = factMap.get(remoteFact.id);
        if (!existing || remoteFact.timestamp > existing.timestamp) {
            factMap.set(remoteFact.id, remoteFact);
        }
    });

    return Array.from(factMap.values()).sort((a, b) => a.timestamp - b.timestamp);
};
