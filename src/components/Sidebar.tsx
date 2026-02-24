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
import { Modal } from './ui/modal';
import {
  TeamFilterDropdown,
  CategoryToolSection,
  LocationControls,
  ToolConfigurationForms,
  DraftOperationsList,
  ReferenceLocationsList,
  SavedFactsList
} from './SidebarComponents';
import { getFactContent } from './SidebarComponents/SavedFactsList';

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
  isLoadingFacts?: boolean;
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
  deleteFactMutation = null,
  isLoadingFacts = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textFactContent, setTextFactContent] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [factToDelete, setFactToDelete] = useState<Fact | null>(null);

  const [factToSave, setFactToSave] = useState<{ type: 'OPERATION' | 'TEXT', payload: any } | null>(null);
  const [saveModalTeamId, setSaveModalTeamId] = useState<string>('');
  const [isSavingFact, setIsSavingFact] = useState<boolean>(false);

  const textFactsOrDefault = textFacts ?? [];
  const teamsDataOrDefault = teamsData ?? [];
  const selectedTeamFilterOrDefault = selectedTeamFilter ?? '';
  const setSelectedTeamFilterOrDefault = setSelectedTeamFilter ?? (() => { });
  const serverOperationsOrDefault = serverOperations ?? [];
  const createFactMutationOrDefault = createFactMutation ?? null;
  const refetchFactsOrDefault = refetchFacts ?? (() => { });
  const currentUserEmailOrDefault = currentUserEmail ?? 'Unknown Player';
  const deleteFactMutationOrDefault = deleteFactMutation ?? null;

  // Combine text facts and geo facts for the SavedFactsList
  // Format text facts to match the structure expected by SavedFactsList if needed
  const formattedTextFacts = textFactsOrDefault.map(fact => ({
    ...fact,
    fact_type: 'TEXT' as const, // Ensure type is set
  }));

  // Create a combined list avoiding duplicates (assuming fact_id is unique)
  const existingFactIds = new Set((allFacts || []).map(f => f.fact_id));
  const newTextFacts = formattedTextFacts.filter(f => !existingFactIds.has(f.fact_id));

  const allFactsOrDefault = [...newTextFacts, ...(allFacts || [])];

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
      if (!textFactContent.trim()) {
        alert('Please enter some text content.');
        return;
      }
      setSaveModalTeamId(selectedTeamFilter);
      setFactToSave({ type: 'TEXT', payload: textFactContent });
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
      {/* Team Filter Dropdown */}
      {teamsData && (
        <TeamFilterDropdown
          teamsData={teamsData}
          selectedTeamFilter={selectedTeamFilter || ''}
          setSelectedTeamFilter={setSelectedTeamFilter || (() => { })}
        />
      )}

      {/* Category and Tool Selection */}
      <CategoryToolSection
        selectedCategory={selectedCategory}
        selectedOption={selectedOption}
        handleCategoryChange={handleCategoryChange}
        handleOptionChange={handleOptionChange}
      />

      {selectedOption && (
        <div className="tool-details">
          <LocationControls
            selectedOption={selectedOption}
            points={points}
            currentLocation={currentLocation}
            handleUseCurrentLocation={handleUseCurrentLocation}
            isTwoPointTool={isTwoPointTool}
          />

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
        <DraftOperationsList
          operations={operations}
          serverOperations={serverOperationsOrDefault}
          onSaveOperation={(op) => {
            setSaveModalTeamId(selectedTeamFilter || '');
            setFactToSave({ type: 'OPERATION', payload: op });
          }}
          removeOperation={removeOperation}
        />

        <ReferenceLocationsList
          referencePoints={referencePoints || []}
          onClearReferencePoints={onClearReferencePoints}
        />

        <SavedFactsList
          allFacts={allFactsOrDefault}
          deletingId={deletingId}
          onDeleteFact={(fact) => setFactToDelete(fact)}
          isLoadingFacts={isLoadingFacts}
        />
      </div>

      <Modal
        isOpen={!!factToDelete}
        onClose={() => setFactToDelete(null)}
        title="Delete Fact"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-left">
            Are you sure you want to delete this fact? This action cannot be undone.
          </p>
          {factToDelete && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-700 font-medium text-left">
              {getFactContent(factToDelete)}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setFactToDelete(null)}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!factToDelete || !deleteFactMutation) return;
                setDeletingId(factToDelete.fact_id);
                try {
                  await deleteFactMutation(factToDelete.fact_id);
                  console.log('Fact deleted successfully');
                  refetchFacts();
                } catch (error) {
                  console.error('Failed to delete fact:', error);
                  alert('Failed to delete fact. Please try again.');
                } finally {
                  setDeletingId(null);
                  setFactToDelete(null);
                }
              }}
              disabled={!!deletingId}
            >
              {deletingId ? (
                <>
                  <svg className="w-4 h-4 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Deleting...
                </>
              ) : (
                'Delete Fact'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!factToSave}
        onClose={() => !isSavingFact && setFactToSave(null)}
        title="Save Fact"
      >
        <div className="space-y-4">
          <p className="text-gray-600 mb-2 text-left">
            Select the team you want to save this fact for:
          </p>

          <div className="flex flex-col space-y-2">
            <Label className="text-sm font-medium text-left">Target Team</Label>
            <select
              value={saveModalTeamId}
              onChange={(e) => setSaveModalTeamId(e.target.value)}
              disabled={isSavingFact}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
            >
              <option value="" disabled>Select a team</option>
              {teamsData.map(team => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setFactToSave(null)}
              disabled={isSavingFact}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!factToSave || !createFactMutation || !gameId) return;

                if (!saveModalTeamId) {
                  alert('Please select a target team.');
                  return;
                }

                const targetTeam = teamsData.find(team => team.team_id === saveModalTeamId);
                if (!targetTeam) {
                  alert('Selected team not found.');
                  return;
                }

                const currentUserTeam = teamsData.find(team =>
                  team.players.some((player: any) => player.user_profile.email === currentUserEmail)
                );
                if (!currentUserTeam) {
                  alert('Could not determine your team.');
                  return;
                }

                setIsSavingFact(true);
                try {
                  if (factToSave.type === 'TEXT') {
                    await createFactMutation({
                      game_id: gameId,
                      fact_type: 'TEXT',
                      team_id: targetTeam.team_id,
                      fact_info: {
                        op_type: 'plain_text',
                        op_meta: {
                          text: factToSave.payload,
                          team_id: currentUserTeam.team_id,
                          team_name: currentUserTeam.team_name,
                          player_name: currentUserEmail
                        }
                      }
                    });
                    setTextFactContent('');
                  } else if (factToSave.type === 'OPERATION') {
                    const op = factToSave.payload;
                    const factInfo = convertOperationToFactInfo(op);
                    const enhancedFactInfo = op.featureName ? { ...factInfo, featureName: op.featureName } : factInfo;

                    await createFactMutation({
                      game_id: gameId,
                      fact_type: 'GEO',
                      team_id: targetTeam.team_id,
                      fact_info: {
                        op_type: op.type,
                        op_meta: {
                          ...enhancedFactInfo,
                          team_id: currentUserTeam.team_id,
                          team_name: currentUserTeam.team_name,
                          player_name: currentUserEmail
                        }
                      }
                    });
                    removeOperation(op.id);
                  }

                  refetchFacts();
                  setFactToSave(null);
                } catch (error) {
                  console.error('Failed to save fact:', error);
                  alert('Failed to save fact. Please try again.');
                } finally {
                  setIsSavingFact(false);
                }
              }}
              disabled={isSavingFact || !saveModalTeamId}
            >
              {isSavingFact ? (
                <>
                  <svg className="w-4 h-4 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Saving...
                </>
              ) : (
                'Save Fact'
              )}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

// OperationCard Component - Extracted from the main operations mapping
// Moved components/helpers above the Sidebar usage

export default Sidebar;
