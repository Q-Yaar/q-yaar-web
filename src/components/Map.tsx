import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Heading, Operation } from '../utils/geoTypes';
import { applySingleOperation, calculateDistance, computeHiderArea, globalWorld, getRelativeHeading, differencePolygons, getPerpendicularBisectorLine } from '../utils/geoUtils';

interface MapProps {
    action: string;
    points: number[][];
    setPoints: React.Dispatch<React.SetStateAction<number[][]>>;
    setDistance: React.Dispatch<React.SetStateAction<number | null>>;
    setHeading: React.Dispatch<React.SetStateAction<Heading | null>>;
    radius: number;
    shadingMode: 'inside' | 'outside';
    playArea: any;
    splitDirection: 'North' | 'South' | 'East' | 'West';
    preferredPoint: 'p1' | 'p2';
    areaOpType: 'intersection' | 'difference';
    uploadedAreaForOp: any;
    multiLineStringForOp: any;
    closerFurther: 'closer' | 'further';
    selectedLineIndex: number;
    operations: Operation[];
}

const Map: React.FC<MapProps> = ({
    action, points, setPoints, setDistance, setHeading,
    radius, shadingMode, playArea, splitDirection, preferredPoint,
    areaOpType, uploadedAreaForOp,
    multiLineStringForOp, closerFurther, selectedLineIndex,
    operations
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);

    // Refs to keep track of latest state without triggering re-renders in effects
    const pointsRef = useRef(points);
    const actionRef = useRef(action);

    useEffect(() => {
        pointsRef.current = points;
        actionRef.current = action;

        if (map.current && map.current.getSource('measurement-source')) {
            const source = map.current.getSource('measurement-source') as maplibregl.GeoJSONSource;
            const geojson: GeoJSON.FeatureCollection = {
                'type': 'FeatureCollection',
                'features': []
            };

            // Add current interaction points
            points.forEach(p => {
                geojson.features.push({
                    'type': 'Feature',
                    'geometry': { 'type': 'Point', 'coordinates': p },
                    'properties': {}
                });
            });

            if ((action === 'distance' || action === 'heading') && points.length === 2) {
                geojson.features.push({
                    'type': 'Feature',
                    'geometry': { 'type': 'LineString', 'coordinates': points },
                    'properties': {}
                });
            }

            // --- Apply Operations via Lib ---
            let currentHiderArea = computeHiderArea(playArea, operations);

            if (action === 'closer-to-line' && multiLineStringForOp) {
                if (multiLineStringForOp.type === 'FeatureCollection') {
                    if (selectedLineIndex !== undefined && multiLineStringForOp.features[selectedLineIndex]) {
                        geojson.features.push(multiLineStringForOp.features[selectedLineIndex]);
                    } else {
                        geojson.features.push(...multiLineStringForOp.features);
                    }
                } else if (multiLineStringForOp.type === 'Feature') {
                    geojson.features.push(multiLineStringForOp);
                } else {
                    geojson.features.push({
                        type: 'Feature',
                        geometry: multiLineStringForOp,
                        properties: {}
                    });
                }
            }

            // Apply current active operation (if not yet saved)
            if (['draw-circle', 'split-by-direction', 'hotter-colder', 'closer-to-line'].includes(action)) {
                const currentOp: Operation = {
                    id: 'current',
                    type: action as any,
                    points: [...points],
                    radius,
                    shadingMode,
                    splitDirection,
                    preferredPoint,
                    areaOpType,
                    uploadedArea: uploadedAreaForOp,
                    multiLineString: multiLineStringForOp,
                    closerFurther,
                    selectedLineIndex
                };

                const minPoints = (action === 'draw-circle' || action === 'split-by-direction' || action === 'closer-to-line') ? 1 : (action === 'hotter-colder' ? 2 : 0);
                const hasRequiredInputs = (action === 'areas') ? !!uploadedAreaForOp :
                    (action === 'closer-to-line') ? (!!multiLineStringForOp && points.length >= 1) :
                        points.length >= minPoints;

                if (hasRequiredInputs) {
                    currentHiderArea = applySingleOperation(currentOp, currentHiderArea as any);

                    // If hotter-colder, also show lines for the current operation
                    if (action === 'hotter-colder' && points.length === 2) {
                        geojson.features.push({
                            'type': 'Feature',
                            'geometry': { 'type': 'LineString', 'coordinates': points },
                            'properties': { 'line-type': 'p1-p2' }
                        });
                        const initialArea = computeHiderArea(playArea, []); // Base area for bisector calculation
                        const bisectorLine = getPerpendicularBisectorLine(points[0], points[1], initialArea as any);
                        geojson.features.push({
                            ...bisectorLine,
                            type: 'Feature',
                            properties: { ...bisectorLine.properties, 'line-type': 'bisector' }
                        } as GeoJSON.Feature);
                    }
                }
            }

            // --- Final Shading ---
            if (currentHiderArea) {
                const shadingFeature = differencePolygons(globalWorld, currentHiderArea as any);
                geojson.features.push({
                    ...shadingFeature,
                    type: 'Feature',
                    properties: { ...shadingFeature.properties, 'is-shading': true }
                } as GeoJSON.Feature);
            }

            source.setData(geojson);
        }
    }, [points, action, radius, shadingMode, playArea, splitDirection, preferredPoint, areaOpType, uploadedAreaForOp, multiLineStringForOp, closerFurther, selectedLineIndex, operations]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const container = mapContainerRef.current;
        const instanceId = Math.random().toString(36).substring(7);
        console.log(`[Map ${instanceId}] Initializing Map...`);

        const m = new maplibregl.Map({
            container: container,
            style: `https://tiles.openfreemap.org/styles/liberty`,
            center: [77.591, 12.979],
            zoom: 14
        });

        map.current = m;
        m.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Use ResizeObserver to ensure the map resizes whenever the container size changes
        const resizeObserver = new ResizeObserver(() => {
            if (m) {
                console.log(`[Map ${instanceId}] Container resized, calling m.resize()`);
                m.resize();
            }
        });
        resizeObserver.observe(container);

        m.on('load', () => {
            console.log(`[Map ${instanceId}] Map Loaded`);

            m.addSource('measurement-source', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': []
                }
            });

            // Layer for lines
            m.addLayer({
                'id': 'measurement-line',
                'type': 'line',
                'source': 'measurement-source',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': [
                        'case',
                        ['==', ['get', 'line-type'], 'bisector'], '#ff00ff',
                        '#0000ff'
                    ],
                    'line-width': [
                        'case',
                        ['==', ['get', 'line-type'], 'bisector'], 2,
                        4
                    ],
                    'line-dasharray': [
                        'case',
                        ['==', ['get', 'line-type'], 'bisector'], ['literal', [2, 2]],
                        ['literal', [1, 0]]
                    ]
                },
                'filter': ['==', '$type', 'LineString']
            });

            // Layer for shading
            m.addLayer({
                'id': 'shading-fill',
                'type': 'fill',
                'source': 'measurement-source',
                'paint': {
                    'fill-color': '#000000',
                    'fill-opacity': 0.4
                },
                'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'is-shading', true]]
            });

            // Layer for points
            m.addLayer({
                'id': 'measurement-points',
                'type': 'circle',
                'source': 'measurement-source',
                'paint': {
                    'circle-radius': 6,
                    'circle-color': '#ff0000'
                },
                'filter': ['==', '$type', 'Point']
            });
        });

        m.on('error', (e) => {
            console.error(`[Map ${instanceId}] Map Error:`, e);
        });

        m.on('click', (e) => {
            const currentAction = actionRef.current;

            if (currentAction === 'distance' || currentAction === 'heading' || currentAction === 'draw-circle' || currentAction === 'split-by-direction' || currentAction === 'hotter-colder' || currentAction === 'closer-to-line') {
                const newPoint = [e.lngLat.lng, e.lngLat.lat];
                let currentPoints = pointsRef.current;

                const maxPoints = (currentAction === 'draw-circle' || currentAction === 'split-by-direction' || currentAction === 'closer-to-line') ? 1 : 2;

                if (currentPoints.length >= maxPoints) {
                    // Reset if we already have enough points and click again
                    currentPoints = [newPoint];
                    setPoints(currentPoints);
                    setDistance(null);
                    setHeading(null);
                } else {
                    const updatedPoints = [...currentPoints, newPoint];
                    setPoints(updatedPoints);

                    if (updatedPoints.length === 2) {
                        if (currentAction === 'distance') {
                            setDistance(calculateDistance(updatedPoints[0], updatedPoints[1]));
                        } else if (currentAction === 'heading') {
                            setHeading(getRelativeHeading(updatedPoints[0], updatedPoints[1]) as Heading);
                        }
                    }
                }
            }
        });

        return () => {
            console.log(`[Map ${instanceId}] Cleaning up...`);
            resizeObserver.disconnect();
            if (map.current === m) {
                map.current = null;
            }
            m.remove();
        }
    }, []); // Empty dependency array ensures map is only initialized once

    return (
        <div style={{ display: 'flex', flex: 1, position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mapContainerRef} style={{ flex: 1, width: '100%', height: '100%' }} />
        </div>
    );
};

export default Map;
