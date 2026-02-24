import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { Operation } from '../utils/geoTypes';
import { Fact } from '../models/Fact';
import { Team } from '../models/Team';
import { formatDate } from '../utils/dateUtils';
import { convertOperationToFactInfo } from '../utils/factUtils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';

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

interface OperationCardProps {
  op: Operation;
  index: number;
  onSave: () => void;
  onRemove: () => void;
}

const OperationCard: React.FC<OperationCardProps> = ({ op, index, onSave, onRemove }) => {
  const getOperationDisplayName = (type: Operation['type']) => {
    switch (type) {
      case 'areas':
        return 'Area Operations';
      case 'closer-to-line':
        return 'Distance from Metro Line';
      default:
        return type.replace(/-/g, ' ');
    }
  };

  const getOperationHelpText = () => {
    switch (op.type) {
      case 'draw-circle':
        return `${op.radius}km · Hider ${op.hiderLocation}`;
      case 'split-by-direction':
        return `Hider is ${op.splitDirection}`;
      case 'hotter-colder':
        return `Closer to ${op.preferredPoint}`;
      case 'areas':
        return `${op.areaOpType}${op.featureName ? ` (${op.featureName})` : op.selectedLineIndex !== undefined ? ` (Area ${op.selectedLineIndex + 1})` : ''}`;
      case 'closer-to-line':
        return `${op.closerFurther} than Seeker ${op.featureName ? ` (${op.featureName})` : op.selectedLineIndex !== undefined ? `(Line ${op.selectedLineIndex + 1})` : ''}`;
      case 'polygon-location':
        return `In polygon`;
      default:
        return '';
    }
  };

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden relative mb-3">
      {/* Decorative left border for draft */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl"></div>
      <CardContent className="p-4 pl-5 flex flex-col items-start text-left">
        <div className="font-semibold text-sm mb-1.5 text-gray-800 tracking-tight">
          {index + 1}. {getOperationDisplayName(op.type)} <span className="text-amber-600 text-xs ml-1 font-medium">(Draft)</span>
        </div>
        <div className="text-sm text-gray-600 mb-3 leading-relaxed">
          {getOperationHelpText()}
        </div>
        <div className="flex gap-2 w-full mt-1">
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Draft
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Text Fact Handling Functions
async function handleSaveTextFact(
  textContent: string,
  gameId: string | undefined,
  currentUserEmail: string | undefined,
  teamsData: Team[],
  selectedTeamFilter: string,
  createFactMutation: any,
  refetchFacts: () => void,
  setTextFactContent: (content: string) => void
) {
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
}

const isTextFactValid = (textContent: string, selectedOption: string | null) => {
  return selectedOption === 'text' && !textContent.trim();
};

const getFactMetadata = (fact: Fact) => {
  let playerName = 'System';
  let teamName = '';
  let createdDate = fact.created ? formatDate(fact.created) : 'Unknown Date';

  if (fact.fact_info?.op_meta?.player_name) {
    playerName = fact.fact_info.op_meta.player_name;
  } else if (fact.fact_info?.player_email) {
    playerName = fact.fact_info.player_email;
  }

  if (fact.fact_info?.op_meta?.team_name) {
    teamName = fact.fact_info.op_meta.team_name;
  }

  return { playerName, teamName, createdDate };
};

const getFactDisplayName = (fact: Fact) => {
  if (fact.fact_type === 'TEXT') return 'Text Fact';
  if (fact.fact_type === 'GEO' && fact.fact_info?.op_type) {
    const opType = fact.fact_info.op_type;
    if (opType === 'areas') return 'Area Operation';
    if (opType === 'closer-to-line') return 'Distance from Line';
    return opType.replace(/-/g, ' ');
  }
  return fact.fact_type || 'Unknown Fact';
};

const getFactContent = (fact: Fact) => {
  if (fact.fact_type === 'TEXT') {
    return fact.fact_info?.op_meta?.text || 'No text content';
  } else if (fact.fact_type === 'GEO' && fact.fact_info?.op_type && fact.fact_info?.op_meta) {
    return renderOperationDetails(fact.fact_info.op_type, fact.fact_info.op_meta);
  }
  return 'No details available';
};

// Operation details rendering helper (moved from fact mapping scope)
const renderOperationDetails = (opType: string, opMeta: any) => {
  switch (opType) {
    case 'plain_text':
      return opMeta.text || 'No text content';
    case 'draw-circle':
      return `${opMeta.radius}km · Hider ${opMeta.hiderLocation}`;
    case 'split-by-direction':
      return `Hider is ${opMeta.splitDirection}`;
    case 'hotter-colder':
      return `Closer to ${opMeta.preferredPoint}`;
    case 'areas':
      if (opMeta.featureName) {
        return `${opMeta.areaOpType} (${opMeta.featureName})`;
      }
      return `${opMeta.areaOpType}${opMeta.selectedLineIndex !== undefined ? ` (Area ${opMeta.selectedLineIndex + 1})` : ''}`;
    case 'closer-to-line':
      if (opMeta.featureName) {
        return `${opMeta.closerFurther} than Seeker (${opMeta.featureName})`;
      }
      return `${opMeta.closerFurther} than Seeker ${opMeta.selectedLineIndex !== undefined ? `(Line ${opMeta.selectedLineIndex + 1})` : ''}`;
    case 'polygon-location':
      return `In polygon`;
    default:
      return opType.replace(/-/g, ' ');
  }
};

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
  teamId = 'default-team',
  referencePoints = [],
  onClearReferencePoints,
  onToggleSidebar,
  textFacts = [],
  selectedTeamFilter = '',
  setSelectedTeamFilter = () => { },
  teamsData = [],
  serverOperations = [],
  gameId = 'default-game',
  createFactMutation = null,
  refetchFacts = () => { },
  allFacts = [],
  currentUserEmail = 'Unknown Player',
  deleteFactMutation = null
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textFactContent, setTextFactContent] = useState<string>('');

  const textFactsOrDefault = textFacts ?? [];
  const teamsDataOrDefault = teamsData ?? [];
  const selectedTeamFilterOrDefault = selectedTeamFilter ?? '';
  const setSelectedTeamFilterOrDefault = setSelectedTeamFilter ?? (() => { });
  const serverOperationsOrDefault = serverOperations ?? [];
  const createFactMutationOrDefault = createFactMutation ?? null;
  const refetchFactsOrDefault = refetchFacts ?? (() => { });
  const allFactsOrDefault = allFacts ?? [];
  const currentUserEmailOrDefault = currentUserEmail ?? 'Unknown Player';
  const deleteFactMutationOrDefault = deleteFactMutation ?? null;

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

  return (
    <div className="sidebar">
      {/* Team Filter Dropdown - moved to top */}
      {teamsData && (
        <div className="space-y-2 pb-4 border-b border-gray-100">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block text-left">
            Filter Facts by Team
          </Label>
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {teamsData.map((team) => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <section className="flex flex-col space-y-2">
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Play Area</Label>
        <div className="file-input-wrapper">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => {
              const path = e.target.value;
              if (path) {
                fetchGeoJSON(path, setPlayArea);
              }
            }}
            value={playArea?._source_path || OPERATION_ASSETS['play-area'][0].path}
          >
            {OPERATION_ASSETS['play-area'].map((asset) => (
              <option key={asset.path} value={asset.path}>
                {asset.name}
              </option>
            ))}
          </select>
          {playArea && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginTop: '4px',
              }}
            >
              <div className="success-badge">✓ Bengaluru Urban District Applied</div>
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col space-y-2 mt-4">
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Category</Label>
        <select
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <option value="">Select Category</option>
          <option value="questions">Questions</option>
          <option value="facts">Facts</option>
        </select>
      </section>

      <section className="flex flex-col space-y-2 mt-4">
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Tool</Label>
        <select
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedOption}
          onChange={handleOptionChange}
          disabled={!selectedCategory}
        >
          <option value="">Select Action</option>
          {selectedCategory === 'questions' && (
            <>
              <option value="distance">Distance Measurement</option>
              <option value="heading">Relative Heading</option>
              <option value="polygon-location">Polygon Location</option>
            </>
          )}
          {selectedCategory === 'facts' && (
            <>
              <option value="text">Text Fact</option>
              <option value="draw-circle">Draw Circle</option>
              <option value="split-by-direction">Split by Direction</option>
              <option value="hotter-colder">Hotter / Colder</option>
              <option value="areas">Area Operations</option>
              <option value="closer-to-line">Distance from Metro Line</option>
            </>
          )}
        </select>
      </section>

      {selectedOption && (
        <div className="tool-details">
          {/* Location Controls */}
          {selectedOption !== 'areas' && (
            <div style={{ marginBottom: '10px' }}>
              {isTwoPointTool ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleUseCurrentLocation(0)}
                    disabled={!currentLocation}
                    title={
                      !currentLocation
                        ? 'Waiting for location...'
                        : 'Set Point 1 to Current Location'
                    }
                  >
                    📍 Set P1
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleUseCurrentLocation(1)}
                    disabled={!currentLocation || points.length === 0}
                    title={
                      !currentLocation
                        ? 'Waiting for location...'
                        : points.length === 0
                          ? 'Set P1 first'
                          : 'Set Point 2 to Current Location'
                    }
                  >
                    📍 Set P2
                  </Button>
                </div>
              ) : (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => handleUseCurrentLocation()}
                  disabled={!currentLocation}
                  title={
                    !currentLocation
                      ? 'Waiting for location...'
                      : 'Use/Update Current Location as a Point'
                  }
                >
                  📍 Use Current Location
                </Button>
              )}
            </div>
          )}

          {/* Points Information */}
          {selectedOption !== 'areas' && points.length > 0 && (
            <div className="info-box" style={{ marginBottom: '15px' }}>
              <div>
                <strong>
                  {selectedOption === 'draw-circle' ||
                    selectedOption === 'split-by-direction'
                    ? 'Center'
                    : 'Point 1'}
                  :
                </strong>{' '}
                {points[0][1].toFixed(4)}, {points[0][0].toFixed(4)}
              </div>
              {points.length > 1 &&
                selectedOption !== 'draw-circle' &&
                selectedOption !== 'split-by-direction' && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Point 2:</strong> {points[1][1].toFixed(4)},{' '}
                    {points[1][0].toFixed(4)}
                  </div>
                )}
            </div>
          )}

          {/* Result Information */}
          {selectedOption === 'distance' && distance !== null && (
            <div
              className="info-box"
              style={{
                borderColor: '#4CAF50',
                backgroundColor: '#f0fff4',
                marginBottom: '15px',
              }}
            >
              <strong>Distance:</strong> {distance.toFixed(2)} km
            </div>
          )}

          {selectedOption === 'heading' && heading && (
            <div
              className="info-box"
              style={{
                borderColor: '#2196F3',
                backgroundColor: '#e3f2fd',
                marginBottom: '15px',
              }}
            >
              <strong>Relative Heading:</strong>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                P1 is {heading.lat} and {heading.lon} of P2
              </div>
            </div>
          )}

          {/* Configuration Forms */}
          {selectedOption === 'draw-circle' && (
            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Radius (km)</Label>
                <Input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Hider is</Label>
                <div className="radio-group">
                  <label className="radio-item">
                    <input
                      type="radio"
                      checked={hiderLocation === 'inside'}
                      onChange={() => setHiderLocation('inside')}
                    />{' '}
                    Inside
                  </label>
                  <label className="radio-item">
                    <input
                      type="radio"
                      checked={hiderLocation === 'outside'}
                      onChange={() => setHiderLocation('outside')}
                    />{' '}
                    Outside
                  </label>
                </div>
              </div>
            </div>
          )}

          {selectedOption === 'split-by-direction' && (
            <div className="flex flex-col space-y-2 mt-4">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Hider is toward...</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={splitDirection}
                onChange={(e) => setSplitDirection(e.target.value as any)}
              >
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
              </select>
              <span className="help-text">
                Opposite side will be shaded out.
              </span>
            </div>
          )}

          {selectedOption === 'hotter-colder' && (
            <div className="flex flex-col space-y-2 mt-4">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Closer to...</Label>
              <div className="radio-group">
                <label className="radio-item text-sm">
                  <input
                    type="radio"
                    checked={preferredPoint === 'p1'}
                    onChange={() => setPreferredPoint('p1')}
                  />{' '}
                  P1
                </label>
                <label className="radio-item text-sm">
                  <input
                    type="radio"
                    checked={preferredPoint === 'p2'}
                    onChange={() => setPreferredPoint('p2')}
                  />{' '}
                  P2
                </label>
              </div>
              <span className="text-xs text-gray-500 mt-1">
              </span>
            </div>
          )}

          {selectedOption === 'areas' && (
            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Operation</Label>
                <div className="radio-group">
                  <label className="radio-item text-sm">
                    <input
                      type="radio"
                      checked={areaOpType === 'inside'}
                      onChange={() => setAreaOpType('inside')}
                    />{' '}
                    Inside
                  </label>
                  <label className="radio-item text-sm">
                    <input
                      type="radio"
                      checked={areaOpType === 'outside'}
                      onChange={() => setAreaOpType('outside')}
                    />{' '}
                    Outside
                  </label>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Select Area Asset</Label>
                <div className="file-input-wrapper">
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onChange={(e) => {
                      const path = e.target.value;
                      if (path) {
                        fetchGeoJSON(path, setUploadedAreaForOp);
                      } else {
                        setUploadedAreaForOp(null);
                      }
                    }}
                    value={uploadedAreaForOp?._source_path || ''}
                  >
                    <option value="">Select Asset</option>
                    {OPERATION_ASSETS['areas'].map((asset) => (
                      <option key={asset.path} value={asset.path}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                  {uploadedAreaForOp && (
                    <div className="success-badge">✓ {uploadedAreaForOp.features[selectedLineIndex]?.properties?.name || 'Area Ready'}</div>
                  )}
                </div>

                {uploadedAreaForOp &&
                  uploadedAreaForOp.type === 'FeatureCollection' &&
                  uploadedAreaForOp.features.filter(
                    (f: any) =>
                      f.geometry &&
                      (f.geometry.type === 'Polygon' ||
                        f.geometry.type === 'MultiPolygon'),
                  ).length > 1 && (
                    <div className="flex flex-col space-y-2 mt-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Select Specific Area</Label>
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedLineIndex}
                        onChange={(e) =>
                          setSelectedLineIndex(parseInt(e.target.value) || 0)
                        }
                      >
                        {uploadedAreaForOp.features
                          .map((feat: any, idx: number) => ({ feat, idx }))
                          .filter(
                            (item: any) =>
                              item.feat.geometry &&
                              (item.feat.geometry.type === 'Polygon' ||
                                item.feat.geometry.type === 'MultiPolygon'),
                          )
                          .map((item: any, listIdx: number) => (
                            <option key={item.idx} value={item.idx}>
                              {item.feat.properties?.name || `Area ${listIdx + 1}`}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
              </div> {/* Closing flex flex-col space-y-2 */}
            </div>
          )}

          {selectedOption === 'closer-to-line' && (
            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Hider is...</Label>
                <div className="radio-group">
                  <label className="radio-item text-sm">
                    <input
                      type="radio"
                      checked={closerFurther === 'closer'}
                      onChange={() => setCloserFurther('closer')}
                    />{' '}
                    Closer
                  </label>
                  <label className="radio-item text-sm">
                    <input
                      type="radio"
                      checked={closerFurther === 'further'}
                      onChange={() => setCloserFurther('further')}
                    />{' '}
                    Further
                  </label>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Select Line Asset</Label>
                <div className="file-input-wrapper">
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onChange={(e) => {
                      const path = e.target.value;
                      if (path) {
                        fetchGeoJSON(path, setMultiLineStringForOp);
                      } else {
                        setMultiLineStringForOp(null);
                      }
                    }}
                    value={multiLineStringForOp?._source_path || ''}
                  >
                    <option value="">Select Asset</option>
                    {OPERATION_ASSETS['closer-to-line'].map((asset) => (
                      <option key={asset.path} value={asset.path}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                  {multiLineStringForOp && (
                    <div className="success-badge">✓ {multiLineStringForOp.features[selectedLineIndex]?.properties?.name || 'Line Ready'}</div>
                  )}
                </div>

                {multiLineStringForOp &&
                  multiLineStringForOp.type === 'FeatureCollection' &&
                  multiLineStringForOp.features.length > 1 && (
                    <div className="flex flex-col space-y-2 mt-2">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Select Specific Line</Label>
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedLineIndex}
                        onChange={(e) =>
                          setSelectedLineIndex(parseInt(e.target.value) || 0)
                        }
                      >
                        {multiLineStringForOp.features
                          .map((feat: any, idx: number) => ({ feat, idx }))
                          .filter(
                            (item: any) =>
                              item.feat.geometry.type === 'LineString' ||
                              item.feat.geometry.type === 'MultiLineString',
                          )
                          .map((item: any) => (
                            <option key={item.idx} value={item.idx}>
                              {item.feat.properties?.name || `Line ${item.idx + 1}`}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                <span className="text-xs text-gray-500 mt-2 block">
                  Set Seeker position (P1) on clicking map.
                </span>
              </div>
            </div>
          )}

          {selectedOption === 'text' && (
            <div className="flex flex-col space-y-2 mt-4">
              <textarea
                value={textFactContent}
                onChange={(e) => setTextFactContent(e.target.value)}
                placeholder="Enter text fact details..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {selectedOption === 'polygon-location' && (
            <div className="tool-section">
              <label style={{ marginTop: '10px' }}>Select Polygons Asset</label>
              <div className="file-input-wrapper">
                <select
                  onChange={(e) => {
                    const path = e.target.value;
                    if (path) {
                      fetchGeoJSON(path, setPolygonGeoJSONForOp);
                    } else {
                      setPolygonGeoJSONForOp(null);
                    }
                  }}
                  value={polygonGeoJSONForOp?._source_path || ''}
                >
                  <option value="">Select Asset</option>
                  {OPERATION_ASSETS['polygon-location'].map((asset) => (
                    <option key={asset.path} value={asset.path}>
                      {asset.name}
                    </option>
                  ))}
                </select>
                {polygonGeoJSONForOp && (
                  <div className="success-badge">✓ Polygons Ready</div>
                )}
              </div>

              {points.length > 0 && polygonGeoJSONForOp && (
                <div
                  className="info-box"
                  style={{ marginTop: '10px', backgroundColor: '#f9f9f9' }}
                >
                  {(() => {
                    const {
                      findContainingPolygon,
                    } = require('../utils/geoUtils');
                    const found = findContainingPolygon(
                      points[0],
                      polygonGeoJSONForOp,
                    );
                    if (found) {
                      return (
                        <>
                          <strong>Containing Polygon Attributes:</strong>
                          <pre
                            style={{
                              fontSize: '0.75rem',
                              marginTop: '5px',
                              overflowX: 'auto',
                            }}
                          >
                            {JSON.stringify(found.properties, null, 2)}
                          </pre>
                        </>
                      );
                    }
                    return <i>Point is not inside any polygon.</i>;
                  })()}
                </div>
              )}
              <span className="help-text">
                Click on map to set your location (P1).
              </span>
            </div>
          )}

          {selectedCategory === 'facts' && (
            <Button
              variant="default"
              className="w-full mt-4"
              onClick={handleSaveOperation}
              disabled={
                !selectedOption ||
                (selectedOption === 'areas' && !uploadedAreaForOp) ||
                (selectedOption === 'closer-to-line' && (!multiLineStringForOp || points.length === 0)) ||
                (selectedOption === 'polygon-location' && (!polygonGeoJSONForOp || points.length === 0)) ||
                (['draw-circle', 'split-by-direction', 'hotter-colder'].includes(selectedOption) && points.length === 0) ||
                (selectedOption === 'text' && !textFactContent.trim())
              }
            >
              {selectedOption === 'text' ? 'Save Text Fact' : 'Save as Draft'}
            </Button>
          )}
        </div>
      )
      }

      {/* Synchronized Operations List */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2 flex justify-between items-center">
          Operations & Facts
          {operations.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {operations.length} Items
            </span>
          )}
        </h3>
        {/* Draft Operations - Local only */}
        {operations.filter(op => !serverOperations.some(serverOp => serverOp.id === op.id)).length > 0 && (
          <div
            className="operations-container"
            style={{
              marginTop: '20px',
              borderTop: '1px solid #eee',
              paddingTop: '15px',
            }}
          >
            <h3>Draft Operations</h3>
            <ul className="flex flex-col space-y-0">
              {operations.filter(op => !serverOperations.some(serverOp => serverOp.id === op.id)).map((op, index) => (
                <OperationCard
                  key={op.id}
                  op={op}
                  index={index}
                  onSave={async () => {
                    if (!createFactMutation || !gameId) return;

                    try {
                      // Use the selected team from the dropdown as the target team
                      if (teamsData.length === 0) {
                        alert('No teams available. Please try again later.');
                        return;
                      }

                      // Check if a team is selected
                      if (!selectedTeamFilter) {
                        alert('Please select a team from the dropdown.');
                        return;
                      }

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

                      const targetTeamId = targetTeam.team_id;
                      const currentUserTeamId = currentUserTeam.team_id;
                      const currentUserTeamName = currentUserTeam.team_name;

                      // Convert operation to fact info for GEO facts
                      const factInfo = convertOperationToFactInfo(op);

                      // Add feature name to op_meta if available
                      const enhancedFactInfo = { ...factInfo };

                      // For operations with feature names, add them to the fact
                      if (op.featureName) {
                        enhancedFactInfo.featureName = op.featureName;
                      }

                      // Create GEO fact
                      await createFactMutation({
                        game_id: gameId,
                        fact_type: 'GEO',
                        team_id: targetTeamId,
                        fact_info: {
                          op_type: op.type,
                          op_meta: {
                            ...enhancedFactInfo,
                            team_id: currentUserTeamId,
                            team_name: currentUserTeamName,
                            player_name: currentUserEmail
                          }
                        }
                      });

                      // Remove the draft from local operations since it's now saved
                      removeOperation(op.id);

                      // Refetch facts to update the list
                      refetchFacts();
                      console.log('Fact saved successfully, refetching facts...');
                      alert('Fact saved successfully!');
                    } catch (error) {
                      console.error('Failed to save fact:', error);
                      alert('Failed to save fact. Please try again.');
                    }
                  }}
                  onRemove={() => removeOperation(op.id)}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Saved Facts - From backend */}

        {
          referencePoints && referencePoints.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Reference Locations</h3>
                {onClearReferencePoints && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearReferencePoints}
                    className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <ul className="flex flex-col space-y-3">
                {referencePoints.map((point: number[], index: number) => (
                  <li key={index}>
                    <Card className="w-full shadow-sm border border-emerald-100 bg-emerald-50/30 rounded-xl overflow-hidden relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl"></div>
                      <CardContent className="p-3 pl-5 flex items-center text-left">
                        <div
                          style={{
                            width: '20px',
                            height: '24px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: '50% 50% 50% 0',
                            transform: 'rotate(-45deg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ transform: 'rotate(45deg)' }}>
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-800 tracking-tight">
                            Location {String.fromCharCode(65 + index)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 font-medium">
                            {point[1].toFixed(5)}, {point[0].toFixed(5)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        {
          allFacts && allFacts.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Saved Facts</h3>
              <ul className="flex flex-col space-y-3">
                {allFacts.map((fact: Fact, index: number) => {
                  const handleDeleteFact = async () => {
                    if (!deleteFactMutation) return;

                    if (window.confirm('Are you sure you want to delete this fact?')) {
                      try {
                        await deleteFactMutation(fact.fact_id);
                        console.log('Fact deleted successfully');
                        refetchFacts();
                      } catch (error) {
                        console.error('Failed to delete fact:', error);
                        alert('Failed to delete fact. Please try again.');
                      }
                    }
                  };

                  const { playerName, teamName, createdDate } = getFactMetadata(fact);

                  return (
                    <Card key={fact.fact_id} className="w-full shadow-sm hover:shadow-md transition-shadow border border-gray-100 rounded-xl overflow-hidden relative">
                      {/* Decorative left border */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>
                      <CardContent className="p-4 pl-5 flex justify-between items-start text-left">
                        <div className="flex-1 pr-4">
                          <div className="font-semibold text-sm mb-1.5 text-gray-800 tracking-tight">
                            {index + 1}. {getFactDisplayName(fact)}
                          </div>
                          <div className="text-sm text-gray-600 mb-3 leading-relaxed bg-gray-50/80 p-2.5 rounded-lg border border-gray-100 inline-block w-full">
                            {getFactContent(fact)}
                          </div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                              {playerName}
                            </span>
                            {teamName && (
                              <span className="inline-flex items-center justify-center bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md border border-gray-200">
                                {teamName}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-2 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {createdDate}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDeleteFact}
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-1 rounded-full transition-colors flex-shrink-0"
                          title="Delete Fact"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </ul>
            </div>
          )
        }
      </div>
    </div>
  );
};

// OperationCard Component - Extracted from the main operations mapping
// Moved components/helpers above the Sidebar usage

export default Sidebar;
