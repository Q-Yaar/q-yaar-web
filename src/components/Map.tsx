import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Heading, Operation } from '../utils/geoTypes';
import { LocationPing } from '../models/Location';
import { formatLastSeen } from '../utils/formatTime';
import {
  applySingleOperation,
  calculateDistance,
  computeHiderArea,
  globalWorld,
  getRelativeHeading,
  differencePolygons,
  getPerpendicularBisectorLine,
} from '../utils/geoUtils';
import { getGeoWorker } from '../utils/geoWorkerWrapper';
import { LocateFixed } from 'lucide-react';

interface MapProps {
  action: string;
  points: number[][];
  setPoints: React.Dispatch<React.SetStateAction<number[][]>>;
  setDistance: React.Dispatch<React.SetStateAction<number | null>>;
  setHeading: React.Dispatch<React.SetStateAction<Heading | null>>;
  radius: number;
  hiderLocation: 'inside' | 'outside';
  playArea: any;
  splitDirection: 'North' | 'South' | 'East' | 'West';
  preferredPoint: 'p1' | 'p2';
  areaOpType: 'inside' | 'outside';
  uploadedAreaForOp: any;
  multiLineStringForOp: any;
  closerFurther: 'closer' | 'further';
  selectedLineIndex: number;
  polygonGeoJSONForOp: any;
  operations: Operation[];
  currentLocation?: number[] | null;
  referencePoints?: number[][];
  playerLocations?: LocationPing[];
  onLocationUpdate?: (location: number[]) => void;
  onLocationError?: (error: any) => void;
  onPointPOIInfoChange?: (poiInfo: Array<{
    name?: string;
    type?: string;
    properties?: any;
  } | null>) => void;
}

// Helper function to get operation IDs for comparison
const getOperationIds = (ops: Operation[]): string[] => {
  return ops.map(op => op.id);
};

const Map: React.FC<MapProps> = ({
  action,
  points,
  setPoints,
  setDistance,
  setHeading,
  radius,
  hiderLocation,
  playArea,
  splitDirection,
  preferredPoint,
  areaOpType,
  uploadedAreaForOp,
  multiLineStringForOp,
  closerFurther,
  selectedLineIndex,
  polygonGeoJSONForOp,
  operations,
  currentLocation,
  referencePoints = [],
  playerLocations,
  onLocationUpdate,
  onLocationError,
  onPointPOIInfoChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  // Refs to keep track of latest state without triggering re-renders in effects
  const pointsRef = useRef(points);
  const actionRef = useRef(action);
  const pointPOIInfoRef = useRef<Array<{
    name?: string;
    type?: string;
    properties?: any;
  } | null>>([]);
  const poiSelectionRef = useRef<{
    point?: number[];
    info?: {
      name?: string;
      type?: string;
      properties?: any;
    };
  } | null>(null);

  // Performance optimization: Cache the computed hider area to avoid expensive recomputation
  const hiderAreaCacheRef = useRef<{
    cachedOperations: Operation[];
    cachedHiderArea: any;
  }>({
    cachedOperations: [],
    cachedHiderArea: null
  });

  const [currentHiderArea, setCurrentHiderArea] = useState<any>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const calculationIdRef = useRef<number>(0);

  // Queue operations that arrive before the map is ready
  const pendingOperationsRef = useRef<Operation[] | null>(null);

  useEffect(() => {
    pointsRef.current = points;
    actionRef.current = action;
    // Initialize pointPOIInfoRef with null values if not set
    if (pointPOIInfoRef.current.length !== points.length) {
      pointPOIInfoRef.current = Array(points.length).fill(null);
    }

    // If map is not ready yet, queue the operations for later processing
    if (!isMapReady) {
      pendingOperationsRef.current = operations;
      return; // Don't process yet
    }

    if (map.current && map.current.getSource('measurement-source')) {
      // Clear any pending operations since we can process them now
      pendingOperationsRef.current = null;
      const source = map.current.getSource(
        'measurement-source',
      ) as maplibregl.GeoJSONSource;
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      };

      // Add current interaction points (except for area operations where they are irrelevant)
      if (action !== 'areas' && action !== 'closer-to-line') {
        points.forEach((p) => {
          geojson.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: p },
            properties: {},
          });
        });
      }

      if (
        (action === 'distance' || action === 'heading') &&
        points.length === 2
      ) {
        const distanceKm = calculateDistance(points[0], points[1]);
        const distanceMeters = Math.round(distanceKm * 1000);

        // Add the line
        geojson.features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: points },
          properties: {},
        });

        // Add a point at the midpoint for the distance label
        const midpoint = [
          (points[0][0] + points[1][0]) / 2,
          (points[0][1] + points[1][1]) / 2
        ];
        geojson.features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: midpoint },
          properties: {
            'distance-text': `${distanceMeters} meters`,
            'is-distance-label': true,
          },
        });
      }

      if (action === 'closer-to-line' && multiLineStringForOp) {
        if (multiLineStringForOp.type === 'FeatureCollection') {
          if (selectedLineIndex !== undefined && multiLineStringForOp.features[selectedLineIndex]) {
            const feat = multiLineStringForOp.features[selectedLineIndex];
            if (feat.geometry.type === 'LineString' || feat.geometry.type === 'MultiLineString') {
              geojson.features.push(feat);
            }
          } else {
            const lines = multiLineStringForOp.features.filter((f: any) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
            geojson.features.push(...lines);
          }
        } else if (multiLineStringForOp.type === 'Feature' && (multiLineStringForOp.geometry.type === 'LineString' || multiLineStringForOp.geometry.type === 'MultiLineString')) {
          geojson.features.push(multiLineStringForOp);
        } else if (multiLineStringForOp.type === 'LineString' || multiLineStringForOp.type === 'MultiLineString') {
          geojson.features.push({ type: 'Feature', geometry: multiLineStringForOp, properties: {} });
        }
      }

      if (action === 'polygon-location' && polygonGeoJSONForOp) {
        if (polygonGeoJSONForOp.type === 'FeatureCollection') {
          geojson.features.push(...polygonGeoJSONForOp.features);
        } else if (polygonGeoJSONForOp.type === 'Feature') {
          geojson.features.push(polygonGeoJSONForOp);
        } else {
          geojson.features.push({ type: 'Feature', geometry: polygonGeoJSONForOp, properties: {} });
        }
      }

      if (action === 'areas' && uploadedAreaForOp) {
        if (uploadedAreaForOp.type === 'FeatureCollection') {
          const idx = selectedLineIndex !== undefined ? selectedLineIndex : 0;
          const feat = uploadedAreaForOp.features[idx];
          if (feat) {
            geojson.features.push(feat);
          }
        } else if (uploadedAreaForOp.type === 'Feature') {
          geojson.features.push(uploadedAreaForOp);
        } else {
          geojson.features.push({ type: 'Feature', geometry: uploadedAreaForOp, properties: {} });
        }
      }

      if (currentLocation) {
        geojson.features.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: currentLocation },
          properties: { 'is-current-location': true }
        });
      }

      if (referencePoints?.length > 0) {
        referencePoints.forEach((p, index) => {
          geojson.features.push({
            type: 'Feature', geometry: { type: 'Point', coordinates: p },
            properties: { 'is-reference-point': true, label: String.fromCharCode(65 + index) }
          });
        });
      }

      // Add player last-location markers
      if (playerLocations && playerLocations.length > 0) {
        playerLocations.forEach((loc) => {
          const lon = parseFloat(loc.lon);
          const lat = parseFloat(loc.lat);
          if (!isNaN(lon) && !isNaN(lat)) {
            geojson.features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lon, lat] },
              properties: {
                'is-player-location': true,
                'player-name': loc.player_name || 'Unknown',
                'last-seen': formatLastSeen(loc.timestamp),
              },
            });
          }
        });
      }

      if (poiSelectionRef.current?.point) {
        geojson.features.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: poiSelectionRef.current.point },
          properties: { 'is-poi-selection': true, ...poiSelectionRef.current.info }
        });
      }

      // Initial fast render of points and lines
      source.setData(geojson);

      // --- Apply Operations via Lib with caching optimization ---
      const processGeom = async () => {
        const computationId = ++calculationIdRef.current;
        setIsComputing(true);
        console.log('Processing operations for shading:', operations.length, 'operations');

        try {
          const worker = await getGeoWorker();
          let hiderArea: any = null;
          const cachedOps = hiderAreaCacheRef.current.cachedOperations;
          const currentOpIds = getOperationIds(operations);
          const cachedOpIds = getOperationIds(cachedOps);

          // Check if we can reuse cached result
          const canReuseCache = cachedOps.length > 0 &&
            currentOpIds.length >= cachedOpIds.length &&
            cachedOpIds.every((id, index) => id === currentOpIds[index]);

          if (canReuseCache && hiderAreaCacheRef.current.cachedHiderArea) {
            console.log('Reusing cached hider area (incremental)');
            const newOperations = operations.slice(cachedOps.length);
            hiderArea = hiderAreaCacheRef.current.cachedHiderArea;

            for (const newOp of newOperations) {
              if (hiderArea) {
                hiderArea = await worker.applySingleOperation(newOp, hiderArea);
              }
            }
          } else {
            console.log('Computing hider area from scratch');
            hiderArea = await worker.computeHiderArea(playArea, operations);
          }

          // Apply current active operation
          let previewHiderArea = hiderArea; // hiderArea at this point is result of saved operations

          if (['draw-circle', 'split-by-direction', 'hotter-colder', 'closer-to-line', 'polygon-location', 'areas'].includes(action)) {
            const currentOp: Operation = {
              id: 'current',
              type: action as any,
              points: [...points],
              radius,
              hiderLocation,
              splitDirection,
              preferredPoint,
              areaOpType,
              uploadedArea: uploadedAreaForOp,
              multiLineString: multiLineStringForOp,
              closerFurther,
              selectedLineIndex,
              polygonGeoJSON: polygonGeoJSONForOp,
            };

            const minPoints = ['draw-circle', 'split-by-direction', 'closer-to-line'].includes(action) ? 1 : action === 'hotter-colder' ? 2 : 0;
            const hasRequiredInputs = action === 'areas' ? !!uploadedAreaForOp :
              action === 'closer-to-line' ? !!multiLineStringForOp && points.length >= 1 :
                action === 'polygon-location' ? !!polygonGeoJSONForOp && points.length >= 1 :
                  points.length >= minPoints;

            if (hasRequiredInputs) {
              previewHiderArea = await worker.applySingleOperation(currentOp, previewHiderArea);

              if (action === 'hotter-colder' && points.length === 2) {
                const distanceKm = await worker.calculateDistance(points[0], points[1]);
                const distanceMeters = Math.round(distanceKm * 1000);

                geojson.features.push({
                  type: 'Feature',
                  geometry: { type: 'LineString', coordinates: points },
                  properties: { 'line-type': 'p1-p2' },
                });

                const midpoint = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
                geojson.features.push({
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: midpoint },
                  properties: { 'distance-text': `${distanceMeters} meters`, 'is-distance-label': true },
                });

                const initialArea = await worker.computeHiderArea(playArea, []);
                const bisectorLine = await worker.getPerpendicularBisectorLine(points[0], points[1], initialArea);
                geojson.features.push({
                  ...bisectorLine,
                  type: 'Feature',
                  properties: { ...bisectorLine.properties, 'line-type': 'bisector' },
                } as GeoJSON.Feature);
              }
            }
          }

          // Update cache if this is still the latest request
          if (computationId === calculationIdRef.current) {
            // CACHE stage: Only cache the result of SAVED operations
            hiderAreaCacheRef.current = {
              cachedOperations: operations,
              cachedHiderArea: hiderArea
            };

            // Final Shading based on PREVIEW area
            if (previewHiderArea) {
              const shadingFeature = await worker.differencePolygons(globalWorld, previewHiderArea);
              geojson.features.push({
                ...shadingFeature,
                type: 'Feature',
                properties: { ...shadingFeature.properties, 'is-shading': true },
              } as GeoJSON.Feature);
            }

            // Reference Points etc. (these are fast, but we need to add them after async part)
            if (currentLocation) {
              geojson.features.push({
                type: 'Feature', geometry: { type: 'Point', coordinates: currentLocation },
                properties: { 'is-current-location': true }
              });
            }
            if (referencePoints?.length > 0) {
              referencePoints.forEach((p, index) => {
                geojson.features.push({
                  type: 'Feature', geometry: { type: 'Point', coordinates: p },
                  properties: { 'is-reference-point': true, label: String.fromCharCode(65 + index) }
                });
              });
            }
            // Re-add player location markers after async computation
            if (playerLocations && playerLocations.length > 0) {
              playerLocations.forEach((loc) => {
                const lon = parseFloat(loc.lon);
                const lat = parseFloat(loc.lat);
                if (!isNaN(lon) && !isNaN(lat)) {
                  geojson.features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [lon, lat] },
                    properties: {
                      'is-player-location': true,
                      'player-name': loc.player_name || 'Unknown',
                      'last-seen': formatLastSeen(loc.timestamp),
                    },
                  });
                }
              });
            }
            if (poiSelectionRef.current?.point) {
              geojson.features.push({
                type: 'Feature', geometry: { type: 'Point', coordinates: poiSelectionRef.current.point },
                properties: { 'is-poi-selection': true, ...poiSelectionRef.current.info }
              });
            }

            // Heavy results update
            source.setData(geojson);
            setIsComputing(false);
          }
        } catch (error) {
          console.error('Worker error:', error);
          if (computationId === calculationIdRef.current) setIsComputing(false);
        }
      };

      processGeom();
    }
  }, [
    points,
    action,
    radius,
    hiderLocation,
    playArea,
    splitDirection,
    preferredPoint,
    areaOpType,
    uploadedAreaForOp,
    multiLineStringForOp,
    closerFurther,
    selectedLineIndex,
    operations,
    currentLocation,
    referencePoints,
    playerLocations,
    isMapReady,
  ]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;
    const instanceId = Math.random().toString(36).substring(7);
    console.log(`[Map ${instanceId}] Initializing Map...`);

    const m = new maplibregl.Map({
      container: container,
      style: `https://tiles.openfreemap.org/styles/liberty`,
      center: [77.591, 12.979],
      zoom: 10,
    });

    map.current = m;
    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add GeolocateControl
    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: false
    });

    m.addControl(geolocateControl, 'top-right');

    // Handle geolocation events
    geolocateControl.on('geolocate', (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const userLocation = [longitude, latitude];
      console.log(`[Map ${instanceId}] Geolocation update:`, userLocation);

      // Update current location if it's different from the last known location
      if (currentLocation &&
        currentLocation[0] === userLocation[0] &&
        currentLocation[1] === userLocation[1]) {
        return; // Location hasn't changed
      }

      // Call the onLocationUpdate callback if provided
      if (onLocationUpdate) {
        onLocationUpdate(userLocation);
      }
    });

    geolocateControl.on('error', (error: GeolocationPositionError) => {
      console.warn(`[Map ${instanceId}] Geolocation error:`, error);
      if (onLocationError) {
        onLocationError(error);
      }
    });

    // Use ResizeObserver to ensure the map resizes whenever the container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (m) {
        console.log(
          `[Map ${instanceId}] Container resized, calling m.resize()`,
        );
        m.resize();
      }
    });
    resizeObserver.observe(container);

    m.on('load', () => {
      console.log(`[Map ${instanceId}] Map Loaded`);

      m.addSource('measurement-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Mark the map as ready, which will trigger the useEffect to process any queued operations
      console.log(`[Map ${instanceId}] Setting map ready flag`);
      setIsMapReady(true);

      // Simplified 3-layer structure:
      // 1. Base map (provided by map style)
      // 2. Area overlay for showing facts (shading-fill)
      // 3. Points for selected points (all-points)

      // Layer for shading (area overlay for facts)
      m.addLayer({
        id: 'shading-fill',
        type: 'fill',
        source: 'measurement-source',
        paint: {
          'fill-color': '#000000',
          'fill-opacity': 0.4,
        },
        filter: ['all', ['==', '$type', 'Polygon'], ['==', 'is-shading', true]],
      });

      // Layer for lines (between points)
      m.addLayer({
        id: 'measurement-lines',
        type: 'line',
        source: 'measurement-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
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
          ],
        },
        filter: ['==', '$type', 'LineString']
      });

      // Layer for distance labels on lines
      m.addLayer({
        id: 'distance-labels',
        type: 'symbol',
        source: 'measurement-source',
        layout: {
          'text-field': ['get', 'distance-text'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 14,
          'text-offset': [0, 1.5],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#000000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-halo-blur': 1,
        },
        filter: ['all', ['==', '$type', 'Point'], ['has', 'distance-text'], ['==', 'is-distance-label', true]]
      });

      // Single consolidated layer for all points
      m.addLayer({
        id: 'all-points',
        type: 'circle',
        source: 'measurement-source',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'is-poi-selection'], true], 12,
            ['==', ['get', 'is-current-location'], true], 8,
            ['==', ['get', 'is-reference-point'], true], 8,
            ['==', ['get', 'is-player-location'], true], 8,
            6
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'is-poi-selection'], true], '#4CAF50',
            ['==', ['get', 'is-current-location'], true], '#007cbf',
            ['==', ['get', 'is-reference-point'], true], '#FF5722',
            ['==', ['get', 'is-player-location'], true], '#009688',
            '#ff0000'
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'is-poi-selection'], true], 3,
            ['==', ['get', 'is-current-location'], true], 2,
            ['==', ['get', 'is-reference-point'], true], 2,
            ['==', ['get', 'is-player-location'], true], 2,
            0
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'is-poi-selection'], true], '#FFFFFF',
            ['==', ['get', 'is-current-location'], true], '#ffffff',
            ['==', ['get', 'is-reference-point'], true], '#ffffff',
            ['==', ['get', 'is-player-location'], true], '#ffffff',
            'transparent'
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'is-poi-selection'], true], 0.8,
            1
          ]
        },
        filter: [
          'all',
          ['==', '$type', 'Point'],
          ['!has', 'is-shading'],
          ['!has', 'is-distance-label']
        ]
      });

      // Player location labels (name + last seen)
      m.addLayer({
        id: 'player-location-labels',
        type: 'symbol',
        source: 'measurement-source',
        layout: {
          'text-field': ['concat', ['get', 'player-name'], '\n', ['get', 'last-seen']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-offset': [0, 2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#009688',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-halo-blur': 0.5,
        },
        filter: ['all', ['==', '$type', 'Point'], ['==', 'is-player-location', true]]
      });
    });

    m.on('error', (e) => {
      console.error(`[Map ${instanceId}] Map Error:`, e);
    });

    // Add hover cursor feedback for POIs
    m.on('mousemove', (e) => {
      const currentAction = actionRef.current;
      if (
        currentAction === 'distance' ||
        currentAction === 'heading' ||
        currentAction === 'draw-circle' ||
        currentAction === 'split-by-direction' ||
        currentAction === 'hotter-colder' ||
        currentAction === 'closer-to-line' ||
        currentAction === 'polygon-location'
      ) {
        try {
          // Check if hovering over base map POIs
          const baseMapFeatures = m.queryRenderedFeatures(e.point, {
            layers: ['poi_r1', 'poi_r7', 'poi_r20', 'poi_transit'] // POIs at different resolutions
          });

          if (baseMapFeatures.length > 0) {
            m.getCanvas().style.cursor = 'pointer';
          } else {
            m.getCanvas().style.cursor = 'crosshair';
          }
        } catch (error) {
          console.warn('Error querying POI layers on mousemove:', error);
          m.getCanvas().style.cursor = 'crosshair';
        }
      }
    });

    m.on('click', (e) => {
      const currentAction = actionRef.current;

      if (
        currentAction === 'distance' ||
        currentAction === 'heading' ||
        currentAction === 'draw-circle' ||
        currentAction === 'split-by-direction' ||
        currentAction === 'hotter-colder' ||
        currentAction === 'closer-to-line' ||
        currentAction === 'polygon-location'
      ) {
        // Use MapLibre GL JS native feature querying
        // Query our consolidated points layer and base map layers for POIs
        const measurementFeatures = m.queryRenderedFeatures(e.point, {
          layers: ['all-points']
        });

        // Query base map layers for POIs
        let baseMapFeatures: any[] = [];
        try {
          baseMapFeatures = m.queryRenderedFeatures(e.point, {
            layers: ['poi_r1', 'poi_r7', 'poi_r20', 'poi_transit'] // POIs at different resolutions
          });
        } catch (error) {
          console.warn('Error querying POI layers:', error);
        }

        // Check if we clicked on an existing measurement point
        const clickedOnMeasurementPoint = measurementFeatures.some(feature =>
          feature.layer.id === 'all-points'
        );

        if (clickedOnMeasurementPoint) {
          // If clicked on existing measurement point, don't add new point
          return;
        }

        // If we clicked on a base map POI, use its coordinates
        let newPoint = [e.lngLat.lng, e.lngLat.lat];
        let poiInfo = null;

        // Debug: Log available layers if no POIs found (only once per session)
        if (baseMapFeatures.length === 0 && !((window as any).poiLayersLogged)) {
          console.log('Available base map layers:',
            m.getStyle().layers.map(l => l.id).filter(id =>
              !id.startsWith('measurement-') && !id.startsWith('shading-') &&
              !id.startsWith('current-') && !id.startsWith('reference-')
            )
          );
          (window as any).poiLayersLogged = true;
        }

        if (baseMapFeatures.length > 0) {
          // Use the first POI feature's coordinates
          const poiFeature = baseMapFeatures[0];
          if (poiFeature.geometry.type === 'Point') {
            newPoint = poiFeature.geometry.coordinates as [number, number];
          } else if (poiFeature.geometry.type === 'Polygon') {
            // For polygon features, use the centroid or first coordinate
            newPoint = poiFeature.geometry.coordinates[0][0] as [number, number];
          }
          poiInfo = {
            name: poiFeature.properties?.name || 'Unnamed POI',
            type: poiFeature.layer.id,
            properties: poiFeature.properties
          };
          console.log('Selected POI:', poiInfo, 'at', newPoint);
        }

        let currentPoints = pointsRef.current;

        const maxPoints =
          currentAction === 'draw-circle' ||
            currentAction === 'split-by-direction' ||
            currentAction === 'closer-to-line' ||
            currentAction === 'polygon-location'
            ? 1
            : 2;

        // Update POI info for the new point
        const newPOIInfo = poiInfo ? {
          name: poiInfo.name,
          type: poiInfo.type,
          properties: poiInfo.properties
        } : null;

        if (currentPoints.length >= maxPoints) {
          // Reset if we already have enough points and click again
          currentPoints = [newPoint];
          pointPOIInfoRef.current = [newPOIInfo];
          setPoints(currentPoints);
          setDistance(null);
          setHeading(null);
        } else {
          const updatedPoints = [...currentPoints, newPoint];
          const updatedPOIInfo = [...pointPOIInfoRef.current, newPOIInfo];
          pointPOIInfoRef.current = updatedPOIInfo;
          setPoints(updatedPoints);
        }

        // Call the callback if provided
        if (onPointPOIInfoChange) {
          onPointPOIInfoChange([...pointPOIInfoRef.current]);
        }

        // Update POI selection ref for visual confirmation
        if (poiInfo) {
          poiSelectionRef.current = {
            point: newPoint,
            info: {
              name: poiInfo.name,
              type: poiInfo.type,
              properties: poiInfo.properties
            }
          };
        } else {
          poiSelectionRef.current = null;
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
    };
  }, []); // Empty dependency array ensures map is only initialized once

  useEffect(() => {
    if (points.length === 2) {
      if (action === 'distance') {
        setDistance(calculateDistance(points[0], points[1]));
      } else if (action === 'heading') {
        setHeading(getRelativeHeading(points[0], points[1]) as Heading);
      }
    } else {
      setDistance(null);
      setHeading(null);
    }
  }, [points, action, setDistance, setHeading]);

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        ref={mapContainerRef}
        style={{ flex: 1, width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default Map;
