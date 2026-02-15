import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { Operation } from '../utils/geoTypes';
import { Fact } from '../models/Fact';
import { Team } from '../models/Team';
import { formatDate } from '../utils/dateUtils';
import { convertOperationToFactInfo } from '../utils/factUtils';
import {
  TeamFilterDropdown,
  PlayAreaSection,
  CategoryToolSection,
  LocationControls,
  ToolConfigurationForms,
  DraftOperationsList,
  ReferenceLocationsList,
  SavedFactsList
} from './SidebarComponents';

const PUBLIC_ASSETS = [
  {
    name: 'Bengaluru Urban District',
    path: '/assets/geojsons/bengaluru/bengaluru_urban_district.geojson',
  },
  {
    name: 'Bengaluru Corporations',
    path: '/assets/geojsons/bengaluru/bengaluru-corporations.geojson',
  },
  {
    name: 'Metro Lines',
    path: '/assets/geojsons/bengaluru/metro_lines.geojson',
  },
  {
    name: 'Nearest Metro Line',
    path: '/assets/geojsons/bengaluru/metro_nearest_regions.geojson',
  },
];

// Define asset lists for different operations
const OPERATION_ASSETS = {
  'play-area': [
    {
      name: 'Bengaluru Urban District',
      path: '/assets/geojsons/bengaluru/bengaluru_urban_district.geojson',
    }
  ],
  'areas': [
    {
      name: 'Bengaluru Corporations',
      path: '/assets/geojsons/bengaluru/bengaluru-corporations.geojson',
    },
    {
      name: 'Nearest Metro Line',
      path: '/assets/geojsons/bengaluru/metro_nearest_regions.geojson',
    },
  ],
  'closer-to-line': [
    {
      name: 'Metro Lines',
      path: '/assets/geojsons/bengaluru/metro_lines.geojson',
    }
  ],
  'polygon-location': [
    {
      name: 'Bengaluru Corporations',
      path: '/assets/geojsons/bengaluru/bengaluru-corporations.geojson',
    },
    {
      name: 'Nearest Metro Line',
      path: '/assets/geojsons/bengaluru/metro_nearest_regions.geojson',
    },
  ]
};

interface Heading {
  lat: string;
  lon: string;
}

interface SidebarProps {
  onSelectOption: (option: string) => void;
  points: number[][];
  distance: number | null;
  heading: Heading | null;
  radius: number;
  setRadius: (radius: number) => void;
  hiderLocation: 'inside' | 'outside';
  setHiderLocation: (mode: 'inside' | 'outside') => void;
  playArea: any;
  setPlayArea: (area: any) => void;
  splitDirection: 'North' | 'South' | 'East' | 'West';
  setSplitDirection: (dir: 'North' | 'South' | 'East' | 'West') => void;
  preferredPoint: 'p1' | 'p2';
  setPreferredPoint: (p: 'p1' | 'p2') => void;
  areaOpType: 'inside' | 'outside';
  setAreaOpType: (type: 'inside' | 'outside') => void;
  uploadedAreaForOp: any;
  setUploadedAreaForOp: (area: any) => void;
  multiLineStringForOp: any;
  setMultiLineStringForOp: (area: any) => void;
  closerFurther: 'closer' | 'further';
  setCloserFurther: (val: 'closer' | 'further') => void;
  selectedLineIndex: number;
  setSelectedLineIndex: (val: number) => void;

  polygonGeoJSONForOp: any;
  setPolygonGeoJSONForOp: (area: any) => void;
  operations: Operation[];
  setOperations: (ops: Operation[]) => void;
  setPoints: (points: number[][]) => void;
  currentLocation?: number[] | null;
  teamId?: string;
  referencePoints?: number[][];
  onClearReferencePoints?: () => void;
  onToggleSidebar?: () => void;
  textFacts?: Fact[];
  selectedTeamFilter?: string;
  setSelectedTeamFilter?: (teamId: string) => void;
  teamsData?: any[];
  serverOperations?: any[];
  gameId?: string;
  createFactMutation?: ((arg: any) => Promise<any>) | null;
  refetchFacts?: () => void;
  allFacts?: Fact[];
  currentUserEmail?: string;
  deleteFactMutation?: ((factId: string) => Promise<any>) | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  onSelectOption,
  points,
  distance,
  heading,
  radius,
  setRadius,
  hiderLocation,
  setHiderLocation,
  playArea,
  setPlayArea,
  splitDirection,
  setSplitDirection,
  preferredPoint,
  setPreferredPoint,
  areaOpType,
  setAreaOpType,
  uploadedAreaForOp,
  setUploadedAreaForOp,
  multiLineStringForOp,
  setMultiLineStringForOp,
  closerFurther,
  setCloserFurther,
  selectedLineIndex,
  setSelectedLineIndex,

  polygonGeoJSONForOp,
  setPolygonGeoJSONForOp,
  operations,
  setOperations,
  setPoints,
  currentLocation,
  gameId = 'default-game',
  teamId = 'default-team',
  referencePoints = [],
  onClearReferencePoints,
  onToggleSidebar,
  textFacts = [],
  teamsData = [],
  selectedTeamFilter = '',
  setSelectedTeamFilter = () => {},
  serverOperations = [],
  createFactMutation = null,
  refetchFacts = () => {},
  allFacts = [],
  currentUserEmail = 'Unknown Player',
  deleteFactMutation = null,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textFactContent, setTextFactContent] = useState<string>('');

  const fetchGeoJSON = async (path: string, setter: (data: any) => void) => {
    try {
      const response = await fetch(path);
      const data = await response.json();
      // Store path in the object so dropdown can show correctly
      data._source_path = path;
      setter(data);
      setSelectedLineIndex(0);
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
  }, [playArea, setPlayArea]);

  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const category = event.target.value;
    setSelectedCategory(category);
    setSelectedOption('');
    onSelectOption('');
    setPoints([]);
    setTextFactContent('');
  };

  const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedOption(value);
    onSelectOption(value);
    if (value === 'areas') {
      setPoints([]);
    }
    // Text fact content is managed separately
    if (value !== 'text') {
      setTextFactContent('');
    }
  };

  const handleSaveOperation = () => {
    if (!selectedOption) return;
    
    // Handle text facts separately from geo operations
    if (selectedOption === 'text') {
      handleSaveTextFact(
        textFactContent,
        gameId,
        currentUserEmail,
        teamsData,
        selectedTeamFilter,
        createFactMutation,
        refetchFacts,
        setTextFactContent
      );
      return;
    }
    
    // For geo operations, check the usual requirements
    if (
      selectedOption !== 'areas' &&
      selectedOption !== 'closer-to-line' &&
      points.length === 0
    )
      return;
    if (
      selectedOption === 'closer-to-line' &&
      (!multiLineStringForOp || points.length === 0)
    )
      return;
    if (selectedOption === 'polygon-location' && !polygonGeoJSONForOp) return;

    // Add feature name to the operation if available
    const featureName = (selectedOption === 'areas' && uploadedAreaForOp && selectedLineIndex !== undefined)
      ? uploadedAreaForOp.features[selectedLineIndex]?.properties?.name
      : (selectedOption === 'closer-to-line' && multiLineStringForOp && selectedLineIndex !== undefined)
        ? multiLineStringForOp.features[selectedLineIndex]?.properties?.name
        : undefined;

    const newOp: Operation = {
      id: Date.now().toString(),
      type: selectedOption as any,
      points: [...points],
      radius,
      hiderLocation,
      splitDirection,
      preferredPoint,
      areaOpType: areaOpType as 'inside' | 'outside',
      uploadedArea: uploadedAreaForOp,
      multiLineString: multiLineStringForOp,
      closerFurther,
      selectedLineIndex,
      polygonGeoJSON: polygonGeoJSONForOp,
      featureName,
      timestamp: Date.now(),
    };

    setOperations([...operations, newOp]);
  };

  const isTwoPointTool = !(
    selectedOption === 'draw-circle' ||
    selectedOption === 'split-by-direction' ||
    selectedOption === 'closer-to-line' ||
    selectedOption === 'polygon-location'
  );

  const handleUseCurrentLocation = (targetIndex?: number) => {
    if (!currentLocation) {
      alert(
        'Current location is not available yet. Please enable location services.',
      );
      return;
    }

    const maxPoints = isTwoPointTool ? 2 : 1;

    let indexToSet = targetIndex;

    // Auto-determine logic if no index specified (for single point tools or generic behavior)
    if (indexToSet === undefined) {
      if (points.length < maxPoints) {
        indexToSet = points.length;
      } else {
        // If full, overwrite the last point (P2 for 2-point tools, P1 for 1-point)
        indexToSet = maxPoints - 1;
      }
    }

    if (indexToSet > points.length) {
      alert(`Please set Point ${indexToSet} first.`);
      return;
    }

    const newPoints = [...points];
    newPoints[indexToSet] = currentLocation;

    // If we set P1 and P2 was already set, we keep P2.
    // Logic handles this naturally by using index assignment.

    setPoints(newPoints);
  };

  const removeOperation = (id: string) => {
    setOperations(operations.filter((op) => op.id !== id));
  };

  const isTextFactValid = (textContent: string, selectedOption: string | null) => {
    return selectedOption === 'text' && !textContent.trim();
  };

  return (
    <div className="sidebar">
      <header style={{ display: 'flex', alignItems: 'center' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
            }}
            title="Hide Sidebar"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}
        <h2>Map Tools</h2>
      </header>

      {/* Team Filter Dropdown */}
      <TeamFilterDropdown
        teamsData={teamsData}
        selectedTeamFilter={selectedTeamFilter}
        setSelectedTeamFilter={setSelectedTeamFilter}
      />

      {/* Play Area Section */}
      <PlayAreaSection
        playArea={playArea}
        setPlayArea={setPlayArea}
        OPERATION_ASSETS={OPERATION_ASSETS}
        fetchGeoJSON={fetchGeoJSON}
      />

      {/* Category and Tool Selection */}
      <CategoryToolSection
        selectedCategory={selectedCategory}
        selectedOption={selectedOption}
        handleCategoryChange={handleCategoryChange}
        handleOptionChange={handleOptionChange}
      />

      {/* Tool Configuration and Controls */}
      {selectedOption && (
        <>
          {/* Location Controls */}
          <LocationControls
            selectedOption={selectedOption}
            points={points}
            currentLocation={currentLocation}
            handleUseCurrentLocation={handleUseCurrentLocation}
            isTwoPointTool={isTwoPointTool}
          />

          {/* Tool Configuration Forms */}
          <ToolConfigurationForms
            selectedOption={selectedOption}
            points={points}
            distance={distance}
            heading={heading}
            radius={radius}
            setRadius={setRadius}
            hiderLocation={hiderLocation}
            setHiderLocation={setHiderLocation}
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
            polygonGeoJSONForOp={polygonGeoJSONForOp}
            setPolygonGeoJSONForOp={setPolygonGeoJSONForOp}
            textFactContent={textFactContent}
            setTextFactContent={setTextFactContent}
            OPERATION_ASSETS={OPERATION_ASSETS}
            fetchGeoJSON={fetchGeoJSON}
          />

          {/* Save Button */}
          {selectedCategory === 'facts' && (
            <button
              className="save-btn"
              onClick={handleSaveOperation}
              disabled={
                !selectedOption ||
                isTextFactValid(textFactContent, selectedOption) ||
                (selectedOption === 'areas' && !uploadedAreaForOp) ||
                (selectedOption === 'closer-to-line' &&
                  (!multiLineStringForOp || points.length === 0)) ||
                (selectedOption === 'polygon-location' &&
                  (!polygonGeoJSONForOp || points.length === 0)) ||
                ([
                  'draw-circle',
                  'split-by-direction',
                  'hotter-colder',
                ].includes(selectedOption) &&
                  points.length === 0)
              }
            >
              Save as Draft
            </button>
          )}
        </>
      )}

      {/* Draft Operations List */}
      <DraftOperationsList
        operations={operations}
        serverOperations={serverOperations}
        teamsData={teamsData}
        selectedTeamFilter={selectedTeamFilter}
        currentUserEmail={currentUserEmail}
        gameId={gameId}
        createFactMutation={createFactMutation}
        refetchFacts={refetchFacts}
        removeOperation={removeOperation}
      />

      {/* Reference Locations List */}
      <ReferenceLocationsList
        referencePoints={referencePoints}
        onClearReferencePoints={onClearReferencePoints}
      />

      {/* Saved Facts List */}
      <SavedFactsList
        allFacts={allFacts}
        deleteFactMutation={deleteFactMutation}
        refetchFacts={refetchFacts}
      />
    </div>
  );
};

// Text Fact Handling Functions
const handleSaveTextFact = async (
  textContent: string,
  gameId: string,
  currentUserEmail: string,
  teamsData: Team[],
  selectedTeamFilter: string,
  createFactMutation: any,
  refetchFacts: () => void,
  setTextFactContent: (content: string) => void
) => {
  if (!textContent.trim()) {
    alert('Please enter some text content.');
    return;
  }

  try {
    // Find the selected team (target team)
    const targetTeam = teamsData.find(team => team.team_id === selectedTeamFilter);
    if (!targetTeam) {
      alert('Selected team not found. Please try again.');
      return;
    }

    // Find the current user's team for op_meta
    const currentUserTeam = teamsData.find(team =>
      team.players.some((player: any) => player.user_profile.email === currentUserEmail)
    );

    if (!currentUserTeam) {
      alert('Could not determine your team. Please try again.');
      return;
    }

    // Create TEXT fact directly
    await createFactMutation({
      game_id: gameId,
      fact_type: 'TEXT',
      team_id: targetTeam.team_id,
      fact_info: {
        op_type: 'plain_text',
        op_meta: {
          text: textContent,
          team_id: currentUserTeam.team_id,
          team_name: currentUserTeam.team_name,
          player_name: currentUserEmail
        }
      }
    });

    // Clear the text content and refetch facts
    setTextFactContent('');
    refetchFacts();
    alert('Text fact saved successfully!');
  } catch (error) {
    console.error('Failed to save text fact:', error);
    alert('Failed to save text fact. Please try again.');
  }
};

export default Sidebar;
