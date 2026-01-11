export interface Heading {
    lat: string;
    lon: string;
}

export interface Operation {
    id: string;
    type: 'draw-circle' | 'split-by-direction' | 'hotter-colder' | 'areas';
    points: number[][];
    radius?: number;
    shadingMode?: 'inside' | 'outside';
    splitDirection?: 'North' | 'South' | 'East' | 'West';
    preferredPoint?: 'p1' | 'p2';
    areaOpType?: 'intersection' | 'difference';
    uploadedArea?: any;
}
