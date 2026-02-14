import React, { useState, useEffect } from 'react';
import Map from '../../components/Map';
import Sidebar from '../../components/Sidebar';
import { Heading, Operation } from '../../utils/geoTypes';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Header } from '../../components/ui/header';
import { useGetFactsQuery } from '../../apis/api';
import { convertBackendFactToOperation } from '../../utils/factUtils';

// Simple in-memory cache for the last known location
let lastKnownLocation: number[] | null = null;

const MapPage: React.FC = () => {
  const { gameId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(
    window.innerWidth > 768,
  );
  const [action, setAction] = useState<string>('');
  const [points, setPoints] = useState<number[][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [heading, setHeading] = useState<Heading | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const [hiderLocation, setHiderLocation] = useState<'inside' | 'outside'>('inside');
  const [playArea, setPlayArea] = useState<any>(null);
  const [splitDirection, setSplitDirection] = useState<
    'North' | 'South' | 'East' | 'West'
  >('North');
  const [preferredPoint, setPreferredPoint] = useState<'p1' | 'p2'>('p1');
  const [areaOpType, setAreaOpType] = useState<'inside' | 'outside'>('inside');
  const [uploadedAreaForOp, setUploadedAreaForOp] = useState<any>(null);
  const [multiLineStringForOp, setMultiLineStringForOp] = useState<any>(null);
  const [closerFurther, setCloserFurther] = useState<'closer' | 'further'>('closer');
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);
  const [polygonGeoJSON, setPolygonGeoJSON] = useState<any>(null);
  const [localOperations, setLocalOperations] = useState<Operation[]>([]);

  // Initialize with cached location if available
  const [currentLocation, setCurrentLocation] = useState<number[] | null>(
    lastKnownLocation,
  );

  // Fetch facts from the server
  const { data: factsData } = useGetFactsQuery(
    { game_id: gameId!, fact_type: 'GEO' },
    { skip: !gameId }
  );

  // Merge server facts with local operations
  const [operations, setOperations] = useState<Operation[]>([]);

  useEffect(() => {
    if (factsData?.results) {
      const serverOperations = factsData.results
        .map(fact => convertBackendFactToOperation(fact))
        .filter((op): op is Operation => op !== null);

      // Merge server operations with local operations
      // Server operations take precedence for existing IDs
      const mergedOps = [...serverOperations, ...localOperations.filter(
        localOp => !serverOperations.some(serverOp => serverOp.id === localOp.id)
      )];

      setOperations(mergedOps);
    } else {
      setOperations(localOperations);
    }
  }, [factsData, localOperations]);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    const success = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const newLoc = [longitude, latitude];
      setCurrentLocation(newLoc);
      lastKnownLocation = newLoc; // Update cache
    };

    const error = (err: GeolocationPositionError) => {
      console.warn(`Geolocation error (${err.code}): ${err.message}`);
    };

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    const watchId = navigator.geolocation.watchPosition(success, error, options);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <Header title="Interactive Game Map" />
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: isSidebarOpen ? '380px' : '0px',
            height: '100%',
            overflowY: 'auto',
            zIndex: 10,
            transition: 'width 0.3s ease-in-out',
            borderRight: isSidebarOpen ? '1px solid #ddd' : 'none',
            backgroundColor: 'white',
            flexShrink: 0,
          }}
        >
          <Sidebar
            onSelectOption={setAction}
            points={points}
            distance={distance}
            heading={heading}
            radius={radius}
            setRadius={setRadius}
            hiderLocation={hiderLocation}
            setHiderLocation={setHiderLocation}
            playArea={playArea}
            setPlayArea={setPlayArea}
            splitDirection={splitDirection}
            setSplitDirection={setSplitDirection}
            preferredPoint={preferredPoint}
            setPreferredPoint={setPreferredPoint}
            areaOpType={areaOpType}
            setAreaOpType={setAreaOpType}
            uploadedAreaForOp={uploadedAreaForOp}
            setUploadedAreaForOp={setUploadedAreaForOp}
            multiLineStringForOp={multiLineStringForOp}
            setMultiLineStringForOp={setMultiLineStringForOp}
            closerFurther={closerFurther}
            setCloserFurther={setCloserFurther}
            selectedLineIndex={selectedLineIndex}
            setSelectedLineIndex={setSelectedLineIndex}
            polygonGeoJSONForOp={polygonGeoJSON}
            setPolygonGeoJSONForOp={setPolygonGeoJSON}
            operations={operations}
            setOperations={setLocalOperations}
            setPoints={setPoints}
            currentLocation={currentLocation}
            gameId={gameId}
          />
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
          <Map
            action={action}
            points={points}
            setPoints={setPoints}
            setDistance={setDistance}
            setHeading={setHeading}
            radius={radius}
            hiderLocation={hiderLocation}
            playArea={playArea}
            splitDirection={splitDirection}
            preferredPoint={preferredPoint}
            areaOpType={areaOpType}
            uploadedAreaForOp={uploadedAreaForOp}
            multiLineStringForOp={multiLineStringForOp}
            closerFurther={closerFurther}
            selectedLineIndex={selectedLineIndex}
            polygonGeoJSONForOp={polygonGeoJSON}
            operations={operations}
            currentLocation={currentLocation}
          />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
