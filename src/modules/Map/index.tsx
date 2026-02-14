import React, { useState, useEffect } from 'react';
import Map from '../../components/Map';
import Sidebar from '../../components/Sidebar';
import { Heading, Operation } from '../../utils/geoTypes';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Header } from '../../components/ui/header';
import { useGetFactsQuery, useCreateFactMutation, useDeleteFactMutation } from '../../apis/api';
import { useFetchTeamsQuery } from '../../apis/gameApi';
import { useSelector } from 'react-redux';
import { selectAuthState } from '../../redux/auth-reducer';
import { convertBackendFactToOperation } from '../../utils/factUtils';
import { Fact } from '../../models/Fact';

// Simple in-memory cache for the last known location
let lastKnownLocation: number[] | null = null;

const MapPage: React.FC = () => {
  const { gameId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationsParam = searchParams.get('locations');

  const referencePoints = React.useMemo(() => {
    if (!locationsParam) return [];
    try {
      const parsed = JSON.parse(locationsParam);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            typeof p[0] === 'number' &&
            typeof p[1] === 'number',
        )
      ) {
        return parsed as number[][];
      }
      return [];
    } catch (e) {
      console.error('Failed to parse locations param:', e);
      return [];
    }
  }, [locationsParam]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(
    window.innerWidth > 768,
  );
  const [action, setAction] = useState<string>('');
  const [points, setPoints] = useState<number[][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [heading, setHeading] = useState<Heading | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const [hiderLocation, setHiderLocation] = useState<'inside' | 'outside'>(
    'inside',
  );
  const [playArea, setPlayArea] = useState<any>(null);
  const [splitDirection, setSplitDirection] = useState<
    'North' | 'South' | 'East' | 'West'
  >('North');
  const [preferredPoint, setPreferredPoint] = useState<'p1' | 'p2'>('p1');
  const [areaOpType, setAreaOpType] = useState<'inside' | 'outside'>('inside');
  const [uploadedAreaForOp, setUploadedAreaForOp] = useState<any>(null);
  const [multiLineStringForOp, setMultiLineStringForOp] = useState<any>(null);
  const [closerFurther, setCloserFurther] = useState<'closer' | 'further'>(
    'closer',
  );
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);
  const [polygonGeoJSON, setPolygonGeoJSON] = useState<any>(null);
  const [localOperations, setLocalOperations] = useState<Operation[]>([]);

  // Initialize with cached location if available
  const [currentLocation, setCurrentLocation] = useState<number[] | null>(
    lastKnownLocation,
  );

  // Get auth state to access current user information
  const authState = useSelector(selectAuthState);
  const currentUser = authState.authData?.user.data;
  const currentUserEmail = currentUser?.email || 'Unknown Player';

  // Fetch facts from the server
  const { data: factsData, refetch: refetchFacts } = useGetFactsQuery(
    { game_id: gameId! },
    { skip: !gameId },
  );

  // Fetch teams for the game
  const { data: teamsData } = useFetchTeamsQuery(gameId!, { skip: !gameId });
  
  // Create fact mutation for saving drafts
  const [createFactMutation] = useCreateFactMutation();
  
  // Delete fact mutation
  const [deleteFactMutation] = useDeleteFactMutation();

  // Separate GEO facts (operations) from TEXT facts
  const [operations, setOperations] = useState<Operation[]>([]);
  const [serverOperations, setServerOperations] = useState<Operation[]>([]);
  const [textFacts, setTextFacts] = useState<Fact[]>([]);
  const [filteredFacts, setFilteredFacts] = useState<Fact[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');

  useEffect(() => {
    if (factsData?.results) {
      console.log('All received facts:', factsData.results);
      
      const serverOperations = factsData.results
        .filter((fact) => fact.fact_type === 'GEO')
        .map((fact) => convertBackendFactToOperation(fact))
        .filter((op): op is Operation => op !== null);

      const serverTextFacts = factsData.results.filter(
        (fact) => fact.fact_type === 'TEXT',
      );
      
      console.log('GEO facts (operations):', serverOperations);
      console.log('TEXT facts:', serverTextFacts);

      // Sort text facts by creation time (newest first)
      const sortedTextFacts = [...serverTextFacts].sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      // Store server operations for draft detection
      setServerOperations(serverOperations);

      // Merge server operations with local operations
      // Server operations take precedence for existing IDs
      const mergedOps = [
        ...serverOperations,
        ...localOperations.filter(
          (localOp) =>
            !serverOperations.some((serverOp) => serverOp.id === localOp.id),
        ),
      ];

      setOperations(mergedOps);
      setTextFacts(sortedTextFacts);
    } else {
      setOperations(localOperations);
      setServerOperations([]);
      setTextFacts([]);
    }
  }, [factsData, localOperations]);

  // Filter facts based on selected team
  useEffect(() => {
    if (selectedTeamFilter === 'all') {
      setFilteredFacts(textFacts);
    } else {
      const filtered = textFacts.filter((fact) => 
        fact.fact_info.op_meta?.team_id === selectedTeamFilter
      );
      setFilteredFacts(filtered);
      console.log('Filtered facts for team', selectedTeamFilter, ':', filtered);
    }
  }, [textFacts, selectedTeamFilter]);

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

    const watchId = navigator.geolocation.watchPosition(
      success,
      error,
      options,
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleClearReferencePoints = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('locations');
    setSearchParams(newSearchParams);
  };

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
            referencePoints={referencePoints}
            onClearReferencePoints={handleClearReferencePoints}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            textFacts={filteredFacts}
            allFacts={factsData?.results || []}
            selectedTeamFilter={selectedTeamFilter}
            setSelectedTeamFilter={setSelectedTeamFilter}
            teamsData={teamsData}
            serverOperations={serverOperations}
            createFactMutation={createFactMutation}
            refetchFacts={refetchFacts}
            currentUserEmail={currentUserEmail}
            deleteFactMutation={deleteFactMutation}
          />
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          {!isSidebarOpen && (
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
          )}
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
            referencePoints={referencePoints}
          />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
