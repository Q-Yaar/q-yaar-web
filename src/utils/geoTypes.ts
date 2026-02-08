export interface Heading {
    lat: string;
    lon: string;
}

export type OperationType = 'draw-circle' | 'split-by-direction' | 'hotter-colder' | 'areas' | 'closer-to-line' | 'polygon-location' | 'play-area';

export interface Operation {
    id: string;
    type: OperationType;
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
    timestamp?: number;
}

export type FactType = 'note' | 'map' | 'picture';

export interface Fact {
    id: string;
    gameId: string;
    teamId: string;
    answerId?: string;
    type: FactType;
    timestamp: number;
    operation?: OperationType;
    parameters?: any;
}
