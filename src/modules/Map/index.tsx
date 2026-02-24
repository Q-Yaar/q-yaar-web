import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import Map from '../../components/Map';
import Sidebar from '../../components/Sidebar';
import { Heading, Operation } from '../../utils/geoTypes';
import { LocateFixed, Menu, ChevronUp, ChevronDown, ChevronLeft, Layers, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useGetFactsQuery, useCreateFactMutation, useDeleteFactMutation } from '../../apis/api';
import { useFetchTeamsQuery } from '../../apis/gameApi';
import { useSelector } from 'react-redux';
import { selectAuthState } from '../../redux/auth-reducer';
import { convertBackendFactToOperation } from '../../utils/factUtils';
import { Fact } from '../../models/Fact';
import { Team } from '../../models/Team';

// Simple in-memory cache for the last known location
let lastKnownLocation: number[] | null = null;

const OPERATION_ASSETS = {
  'play-area': [
    {
      name: 'Bengaluru Urban District',
      path: '/assets/geojsons/bengaluru/bengaluru_urban_district.geojson',
    }
  ]
};

const MapPage: React.FC = () => {
  const { gameId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationsParam = searchParams.get('locations');
  const { search } = useLocation();
  const navigate = useNavigate();

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
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const [showLayersMenu, setShowLayersMenu] = useState<boolean>(false);
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

  // Separate GEO facts (operations) from TEXT facts
  const [operations, setOperations] = useState<Operation[]>([]);
  const [serverOperations, setServerOperations] = useState<Operation[]>([]);
  const [textFacts, setTextFacts] = useState<Fact[]>([]);
  const [filteredFacts, setFilteredFacts] = useState<Fact[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('');
  const [triggerLocateUser, setTriggerLocateUser] = useState<number>(0);

  // Fetch facts from the server
  const { data: factsData, refetch: refetchFacts, isLoading: isLoadingFacts } = useGetFactsQuery(
    { game_id: gameId!, team_id: selectedTeamFilter },
    { skip: !gameId || !selectedTeamFilter },
  );

  // Fetch teams for the game
  const { data: teamsData } = useFetchTeamsQuery(gameId!, { skip: !gameId });

  // Create fact mutation for saving drafts
  const [createFactMutation] = useCreateFactMutation();

  // Delete fact mutation
  const [deleteFactMutation] = useDeleteFactMutation();

  // Set initial team filter when teamsData is available
  useEffect(() => {
    if (teamsData && teamsData.length > 0) {
      setSelectedTeamFilter(teamsData[0].team_id);
    }
  }, [teamsData]);

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

      console.log('Server operations:', serverOperations);
      console.log('Local operations:', localOperations);
      console.log('Merged operations:', mergedOps);

      setOperations(mergedOps);
      setTextFacts(sortedTextFacts);
    } else {
      setOperations(localOperations);
      setServerOperations([]);
      setTextFacts([]);
    }
  }, [factsData, localOperations]);

  // Since we're now filtering on the server side, filteredFacts = textFacts
  useEffect(() => {
    setFilteredFacts(textFacts);
  }, [textFacts]);

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
      console.warn(`Geolocation error(${err.code}): ${err.message} `);
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

  const fetchGeoJSON = async (path: string, setter: (data: any) => void) => {
    try {
      const response = await fetch(path);
      const data = await response.json();
      data._source_path = path;
      setter(data);
    } catch (err) {
      console.error('Error fetching GeoJSON:', err);
      alert('Failed to load GeoJSON asset');
    }
  };

  // Automatically load Bengaluru Urban District play area on mount
  useEffect(() => {
    if (OPERATION_ASSETS['play-area'].length > 0 && !playArea) {
      fetchGeoJSON(OPERATION_ASSETS['play-area'][0].path, setPlayArea);
    }
  }, [playArea]);

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
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          backgroundColor: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={24} color="#333" />
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
        referencePoints={referencePoints}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${isBottomSheetOpen ? '0' : 'calc(100% - 76px)'})`,
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          pointerEvents: 'none',
          padding: '0 12px',
        }}
      >
        {/* Handle / Search-like Bar */}
        <div
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'white',
            borderRadius: '28px',
            marginBottom: '16px',
            padding: '8px 8px 8px 16px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid #e0e0e0',
          }}
        >
          {/* Layers Selection Menu Popup */}
          {showLayersMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '16px',
                marginBottom: '12px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                border: '1px solid #e0e0e0',
                padding: '8px',
                width: '260px',
                zIndex: 1010,
                pointerEvents: 'auto',
              }}
            >
              <div style={{ textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#666', padding: '8px 12px', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
                Layers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {OPERATION_ASSETS['play-area'].map((asset) => {
                  const isSelected = playArea?._source_path === asset.path;
                  return (
                    <button
                      key={asset.path}
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchGeoJSON(asset.path, setPlayArea);
                        setShowLayersMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: isSelected ? '#f0f8ff' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        color: isSelected ? '#007cbf' : '#333',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>{asset.name}</span>
                      {isSelected && <Check size={16} color="#007cbf" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Left Section: Map layers and context info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              gap: '12px',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLayersMenu(!showLayersMenu);
              }}
              title="Map Layers"
              style={{
                backgroundColor: showLayersMenu ? '#e6f4ff' : '#f5f5f5',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: showLayersMenu ? '#007cbf' : '#555',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = showLayersMenu ? '#e6f4ff' : '#eee'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = showLayersMenu ? '#e6f4ff' : '#f5f5f5'}
            >
              <Layers size={20} />
            </button>
            <div
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 600, color: '#333', fontSize: '15px' }}>Map Tools</span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {filteredFacts.length} {filteredFacts.length === 1 ? 'fact' : 'facts'} loaded
              </span>
            </div>
            <div
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              style={{ color: '#888', marginRight: '8px', cursor: 'pointer' }}
            >
              {isBottomSheetOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '32px',
            backgroundColor: '#e0e0e0',
            margin: '0 8px'
          }} />

          {/* Right Section: Locate User */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTriggerLocateUser(prev => prev + 1);
            }}
            title="Find my location"
            style={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#007cbf',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <LocateFixed size={24} />
          </button>
        </div>

        {/* Sheet Content */}
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'white',
            height: '70vh',
            overflowY: isBottomSheetOpen ? 'auto' : 'hidden',
            paddingTop: '24px',
            paddingBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '24px 24px 0 0',
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
            onToggleSidebar={() => setIsBottomSheetOpen(false)}
            textFacts={filteredFacts}
            allFacts={factsData?.results || []}
            selectedTeamFilter={selectedTeamFilter}
            setSelectedTeamFilter={setSelectedTeamFilter}
            teamsData={teamsData}
            serverOperations={serverOperations}
            createFactMutation={createFactMutation}
            refetchFacts={refetchFacts}
            deleteFactMutation={deleteFactMutation}
            isLoadingFacts={isLoadingFacts}
          />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
