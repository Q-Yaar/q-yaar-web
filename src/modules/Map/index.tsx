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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [action, setAction] = useState<string>('');
  const [points, setPoints] = useState<number[][]>([]);
  const [pointPOIInfo, setPointPOIInfo] = useState<Array<{
    name?: string;
    type?: string;
    properties?: any;
  } | null>>([]);
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

  // Initialize with cached location if available
  const [currentLocation, setCurrentLocation] = useState<number[] | null>(
    lastKnownLocation,
  );

  // Handle location updates from GeolocateControl
  const handleLocationUpdate = (location: number[]) => {
    setCurrentLocation(location);
    lastKnownLocation = location; // Update cache
  };

  const handleLocationError = (error: any) => {
    console.warn('Geolocation error:', error);
    let message = `Failed to get location: ${error.message || 'Unknown error'}`;
    if (error.code === error.PERMISSION_DENIED) {
      message += '\n\nPlease enable location services for this site in your browser settings.';
    } else if (error.code === error.TIMEOUT) {
      message = 'Location request timed out. Please try again.';
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      message = 'Location information is unavailable.';
    }
    alert(message);
  };

  // Get auth state to access current user information
  const authState = useSelector(selectAuthState);
  const currentUser = authState.authData?.user.data;
  const currentUserEmail = currentUser?.email || 'Unknown Player';

  // Determine the team to use for loading facts (first non-user team)
  const getTargetTeamId = () => {
    if (!teamsData || teamsData.length === 0) return '';

    // Find current user's team
    const currentUserTeam = teamsData.find(team =>
      team.players.some(player => player.user_profile.email === currentUserEmail)
    );

    // If we found the user's team, use the first team that isn't the user's team
    if (currentUserTeam) {
      const otherTeams = teamsData.filter(team => team.team_id !== currentUserTeam.team_id);
      if (otherTeams.length > 0) {
        return otherTeams[0].team_id;
      }
    }

    // If no other teams found, use the first team
    return teamsData[0].team_id;
  };

  // Separate GEO facts (operations) from TEXT facts
  const [localOperations, setLocalOperations] = useState<Operation[]>([]);
  const [textFacts, setTextFacts] = useState<Fact[]>([]);
  const [filteredFacts, setFilteredFacts] = useState<Fact[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('');

  // Fetch teams for the game first
  const {
    data: teamsData,
    isLoading: isTeamsLoading,
    error: teamsError
  } = useFetchTeamsQuery(gameId!, { skip: !gameId });

  // Determine target team ID for facts loading
  const targetTeamId = getTargetTeamId();

  // Determine effective team ID (use selected team filter if available, otherwise use auto-detected target)
  const effectiveTeamId = selectedTeamFilter || targetTeamId;

  // Fetch facts from the server - load immediately when we have a target team
  const { data: factsData, refetch: refetchFacts, isLoading: isLoadingFacts } = useGetFactsQuery(
    { game_id: gameId!, team_id: effectiveTeamId },
    { skip: !gameId || !effectiveTeamId },
  );

  // Combine server operations with local operations for the map
  const operations = React.useMemo(() => {
    if (!factsData?.results) {
      return localOperations;
    }

    const serverOperations = factsData.results
      .filter((fact) => fact.fact_type === 'GEO')
      .map((fact) => convertBackendFactToOperation(fact))
      .filter((op): op is Operation => op !== null);

    // Merge server operations with local operations, ensuring no duplicates
    return [
      ...serverOperations,
      ...localOperations.filter(
        (localOp) => !serverOperations.some((serverOp) => serverOp.id === localOp.id)
      ),
    ];
  }, [factsData?.results, localOperations]);


  // Create fact mutation for saving drafts
  const [createFactMutation] = useCreateFactMutation();

  // Delete fact mutation
  const [deleteFactMutation] = useDeleteFactMutation();

  // Set initial team filter when target team is available
  useEffect(() => {
    if (targetTeamId) {
      setSelectedTeamFilter(targetTeamId);
    }
  }, [targetTeamId]);

  useEffect(() => {
    if (factsData?.results) {
      const serverOperations = factsData.results
        .filter((fact) => fact.fact_type === 'GEO')
        .map((fact) => convertBackendFactToOperation(fact))
        .filter((op): op is Operation => op !== null);

      const serverTextFacts = factsData.results.filter(
        (fact) => fact.fact_type === 'TEXT',
      );

      setTextFacts(serverTextFacts);
    } else {
      setTextFacts([]);
    }
  }, [factsData]);

  // Include all facts (both TEXT and GEO) in filteredFacts for display count
  useEffect(() => {
    if (factsData?.results) {
      setFilteredFacts(factsData.results);
    } else {
      setFilteredFacts([]);
    }
  }, [factsData]);

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
        onPointPOIInfoChange={setPointPOIInfo}
        onLocationUpdate={handleLocationUpdate}
        onLocationError={handleLocationError}
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
            pointPOIInfo={pointPOIInfo}
            onClearReferencePoints={handleClearReferencePoints}
            onToggleSidebar={() => setIsBottomSheetOpen(false)}
            textFacts={filteredFacts}
            allFacts={factsData?.results || []}
            selectedTeamFilter={selectedTeamFilter}
            setSelectedTeamFilter={setSelectedTeamFilter}
            teamsData={teamsData}
            isTeamsLoading={isTeamsLoading}
            teamsError={teamsError}
            serverOperations={operations}
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
