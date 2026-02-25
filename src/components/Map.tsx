import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Heading, Operation } from '../utils/geoTypes';
import {
  applySingleOperation,
  calculateDistance,
  computeHiderArea,
  globalWorld,
  getRelativeHeading,
  differencePolygons,
  getPerpendicularBisectorLine,
} from '../utils/geoUtils';
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
  triggerLocateUser?: number;
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
  triggerLocateUser,
  onPointPOIInfoChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Refs to keep track of latest state without triggering re-renders in effects
  const pointsRef = useRef(points);
  const actionRef = useRef(action);
  const pointPOIInfoRef = useRef<Array<{
    name?: string;
    type?: string;
    properties?: any;
  } | null>>([]);
  
  // Performance optimization: Cache the computed hider area to avoid expensive recomputation
  const hiderAreaCacheRef = useRef<{
    cachedOperations: Operation[];
    cachedHiderArea: any;
  }>({
    cachedOperations: [],
    cachedHiderArea: null
  });

  useEffect(() => {
    pointsRef.current = points;
    actionRef.current = action;
    // Initialize pointPOIInfoRef with null values if not set
    if (pointPOIInfoRef.current.length !== points.length) {
      pointPOIInfoRef.current = Array(points.length).fill(null);
    }

    if (map.current && map.current.getSource('measurement-source')) {
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
        geojson.features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: points },
          properties: {},
        });
      }

      // --- Apply Operations via Lib with caching optimization ---
      let currentHiderArea: any = null;
      const cachedOps = hiderAreaCacheRef.current.cachedOperations;
      const currentOpIds = getOperationIds(operations);
      const cachedOpIds = getOperationIds(cachedOps);
      
      // Check if we can reuse cached result
      const canReuseCache = cachedOps.length > 0 && 
                           currentOpIds.length >= cachedOpIds.length &&
                           cachedOpIds.every((id, index) => id === currentOpIds[index]);
      
      if (canReuseCache && hiderAreaCacheRef.current.cachedHiderArea) {
        // Operations were only appended (idempotent assumption) - incremental computation
        const newOperations = operations.slice(cachedOps.length);
        currentHiderArea = hiderAreaCacheRef.current.cachedHiderArea;
        
        // Apply only the new operations incrementally
        newOperations.forEach(newOp => {
          if (currentHiderArea) {
            currentHiderArea = applySingleOperation(newOp, currentHiderArea);
          }
        });
        
        // Update cache with new state
        hiderAreaCacheRef.current = {
          cachedOperations: operations,
          cachedHiderArea: currentHiderArea
        };
      } else {
        // Full recomputation needed (first time, cache invalid, or operations were removed/changed)
        currentHiderArea = computeHiderArea(playArea, operations);
        
        // Update cache
        hiderAreaCacheRef.current = {
          cachedOperations: operations,
          cachedHiderArea: currentHiderArea
        };
      }

      if (action === 'closer-to-line' && multiLineStringForOp) {
        if (multiLineStringForOp.type === 'FeatureCollection') {
          if (
            selectedLineIndex !== undefined &&
            multiLineStringForOp.features[selectedLineIndex]
          ) {
            const feat = multiLineStringForOp.features[selectedLineIndex];
            if (
              feat.geometry.type === 'LineString' ||
              feat.geometry.type === 'MultiLineString'
            ) {
              geojson.features.push(feat);
            }
          } else {
            const lines = multiLineStringForOp.features.filter(
              (f: any) =>
                f.geometry.type === 'LineString' ||
                f.geometry.type === 'MultiLineString',
            );
            geojson.features.push(...lines);
          }
        } else if (
          multiLineStringForOp.type === 'Feature' &&
          (multiLineStringForOp.geometry.type === 'LineString' ||
            multiLineStringForOp.geometry.type === 'MultiLineString')
        ) {
          geojson.features.push(multiLineStringForOp);
        } else if (
          multiLineStringForOp.type === 'LineString' ||
          multiLineStringForOp.type === 'MultiLineString'
        ) {
          geojson.features.push({
            type: 'Feature',
            geometry: multiLineStringForOp,
            properties: {},
          });
        }
      }

      if (action === 'polygon-location' && polygonGeoJSONForOp) {
        if (polygonGeoJSONForOp.type === 'FeatureCollection') {
          geojson.features.push(...polygonGeoJSONForOp.features);
        } else if (polygonGeoJSONForOp.type === 'Feature') {
          geojson.features.push(polygonGeoJSONForOp);
        } else {
          geojson.features.push({
            type: 'Feature',
            geometry: polygonGeoJSONForOp,
            properties: {},
          });
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
          geojson.features.push({
            type: 'Feature',
            geometry: uploadedAreaForOp,
            properties: {},
          });
        }
      }

      // Apply current active operation (if not yet saved)
      if (
        [
          'draw-circle',
          'split-by-direction',
          'hotter-colder',
          'closer-to-line',
          'polygon-location',
          'areas',
        ].includes(action)
      ) {
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

        const minPoints =
          action === 'draw-circle' ||
            action === 'split-by-direction' ||
            action === 'closer-to-line'
            ? 1
            : action === 'hotter-colder'
              ? 2
              : 0;
        const hasRequiredInputs =
          action === 'areas'
            ? !!uploadedAreaForOp
            : action === 'closer-to-line'
              ? !!multiLineStringForOp && points.length >= 1
              : action === 'polygon-location'
                ? !!polygonGeoJSONForOp && points.length >= 1
                : points.length >= minPoints;

        if (hasRequiredInputs) {
          currentHiderArea = applySingleOperation(
            currentOp,
            currentHiderArea as any,
          );

          // If hotter-colder, also show lines for the current operation
          if (action === 'hotter-colder' && points.length === 2) {
            geojson.features.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: points },
              properties: { 'line-type': 'p1-p2' },
            });
            const initialArea = computeHiderArea(playArea, []); // Base area for bisector calculation
            const bisectorLine = getPerpendicularBisectorLine(
              points[0],
              points[1],
              initialArea as any,
            );
            geojson.features.push({
              ...bisectorLine,
              type: 'Feature',
              properties: {
                ...bisectorLine.properties,
                'line-type': 'bisector',
              },
            } as GeoJSON.Feature);
          }
        }
      }

      // --- Final Shading ---
      if (currentHiderArea) {
        const shadingFeature = differencePolygons(
          globalWorld,
          currentHiderArea as any,
        );
        geojson.features.push({
          ...shadingFeature,
          type: 'Feature',
          properties: { ...shadingFeature.properties, 'is-shading': true },
        } as GeoJSON.Feature);
      }

      if (currentLocation) {
        geojson.features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: currentLocation },
          properties: { 'is-current-location': true },
        });
      }

      // Reference Points
      if (referencePoints && referencePoints.length > 0) {
        referencePoints.forEach((p, index) => {
          const label = String.fromCharCode(65 + index); // A, B, C...
          geojson.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: p },
            properties: { 'is-reference-point': true, label },
          });
        });
      }

      source.setData(geojson);
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
      zoom: 14,
    });

    map.current = m;
    m.addControl(new maplibregl.NavigationControl(), 'top-right');

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
      });

      // Single consolidated layer for all points
      m.addLayer({
        id: 'all-points',
        type: 'circle',
        source: 'measurement-source',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'is-current-location'], true], 8,
            ['==', ['get', 'is-reference-point'], true], 8,
            6
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'is-current-location'], true], '#007cbf',
            ['==', ['get', 'is-reference-point'], true], '#FF5722',
            '#ff0000'
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'is-current-location'], true], 2,
            ['==', ['get', 'is-reference-point'], true], 2,
            0
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'is-current-location'], true], '#ffffff',
            ['==', ['get', 'is-reference-point'], true], '#ffffff',
            'transparent'
          ],
        },
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
            layers: ['poi_r1', 'poi_r7', 'poi_r20'] // POIs at different resolutions
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
        // Query both our measurement layers and base map layers for POIs
        const measurementFeatures = m.queryRenderedFeatures(e.point, {
          layers: ['measurement-points', 'reference-points-layer', 'current-location-point']
        });

        // Query base map layers for POIs
        let baseMapFeatures: any[] = [];
        try {
          baseMapFeatures = m.queryRenderedFeatures(e.point, {
            layers: ['poi_r1', 'poi_r7', 'poi_r20'] // POIs at different resolutions
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

        // POI selection confirmation removed for simplified 3-layer structure
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

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    // Request current position and zoom to it
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = [longitude, latitude];

        if (map.current) {
          map.current.flyTo({
            center: userLocation as [number, number],
            zoom: 18,
            essential: true,
          });
        }
      },
      (err) => {
        console.warn('Geolocation request failed:', err);
        let message = `Failed to get location: ${err.message}`;
        if (err.code === err.PERMISSION_DENIED) {
          message +=
            '\n\nPlease enable location services for this site in your browser settings.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        }
        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  useEffect(() => {
    if (triggerLocateUser && triggerLocateUser > 0) {
      handleLocateUser();
    }
  }, [triggerLocateUser]);

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
