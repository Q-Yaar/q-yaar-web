export interface Heading {
    lat: string;
    lon: string;
}

export interface Operation {
    id: string;
    type: 'draw-circle' | 'split-by-direction' | 'hotter-colder' | 'areas' | 'closer-to-line' | 'same-closest-line' | 'polygon-location';
    points: number[][];
    radius?: number;
    shadingMode?: 'inside' | 'outside';
    splitDirection?: 'North' | 'South' | 'East' | 'West';
    preferredPoint?: 'p1' | 'p2';
    areaOpType?: 'inside' | 'outside';
    uploadedArea?: any;
    multiLineString?: any;
    closerFurther?: 'closer' | 'further';
    selectedLineIndex?: number;
    hiderAnswer?: 'yes' | 'no';
    polygonGeoJSON?: any;
}
