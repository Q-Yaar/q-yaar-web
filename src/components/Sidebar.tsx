import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { Operation } from '../utils/geoTypes';
import { Fact } from '../models/Fact';
import { formatDate } from '../utils/dateUtils';
import { convertOperationToFactInfo } from '../utils/factUtils';

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
  selectedTeamFilter = 'all',
  setSelectedTeamFilter = () => {},
  teamsData = [],
  serverOperations = [],
  createFactMutation = null,
  refetchFacts = () => {},
  allFacts = [],
  currentUserEmail = 'Unknown Player',
  deleteFactMutation = null,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');

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
  };

  const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedOption(value);
    onSelectOption(value);
    if (value === 'areas') {
      setPoints([]);
    }
  };

  const handleSaveOperation = () => {
    if (!selectedOption) return;
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

      {/* Team Filter Dropdown - moved to top */}
      {(teamsData && teamsData.length > 0) && (
        <div style={{ margin: '15px 0', padding: '10px 0', borderBottom: '1px solid #eee' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#555' }}>
            Filter Facts by Team
          </label>
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '0.9rem',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Teams</option>
            {teamsData.map((team) => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <section className="tool-section">
        <label>Play Area</label>
        <div className="file-input-wrapper">
          <select
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

      <section className="tool-section">
        <label>Category</label>
        <select value={selectedCategory} onChange={handleCategoryChange}>
          <option value="">Select Category</option>
          <option value="questions">Questions</option>
          <option value="facts">Facts</option>
        </select>
      </section>

      <section className="tool-section">
        <label>Tool</label>
        <select
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
                  <button
                    className="action-btn"
                    onClick={() => handleUseCurrentLocation(0)}
                    disabled={!currentLocation}
                    title={
                      !currentLocation
                        ? 'Waiting for location...'
                        : 'Set Point 1 to Current Location'
                    }
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#007cbf',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentLocation ? 'pointer' : 'not-allowed',
                      opacity: currentLocation ? 1 : 0.6,
                      fontSize: '0.9rem',
                    }}
                  >
                    📍 Set P1
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => handleUseCurrentLocation(1)}
                    disabled={!currentLocation || points.length === 0}
                    title={
                      !currentLocation
                        ? 'Waiting for location...'
                        : points.length === 0
                          ? 'Set P1 first'
                          : 'Set Point 2 to Current Location'
                    }
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#007cbf',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor:
                        currentLocation && points.length > 0
                          ? 'pointer'
                          : 'not-allowed',
                      opacity: currentLocation && points.length > 0 ? 1 : 0.6,
                      fontSize: '0.9rem',
                    }}
                  >
                    📍 Set P2
                  </button>
                </div>
              ) : (
                <button
                  className="action-btn"
                  onClick={() => handleUseCurrentLocation()}
                  disabled={!currentLocation}
                  title={
                    !currentLocation
                      ? 'Waiting for location...'
                      : 'Use/Update Current Location as a Point'
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#007cbf',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentLocation ? 'pointer' : 'not-allowed',
                    opacity: currentLocation ? 1 : 0.6,
                    fontSize: '0.9rem',
                  }}
                >
                  📍 Use Current Location
                </button>
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
            <div className="tool-section">
              <label>Radius (km)</label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value) || 0)}
              />
              <label style={{ marginTop: '10px' }}>Hider is</label>
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
          )}

          {selectedOption === 'split-by-direction' && (
            <div className="tool-section">
              <label>Hider is toward...</label>
              <select
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
            <div className="tool-section">
              <label>Closer to...</label>
              <div className="radio-group">
                <label className="radio-item">
                  <input
                    type="radio"
                    checked={preferredPoint === 'p1'}
                    onChange={() => setPreferredPoint('p1')}
                  />{' '}
                  P1
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    checked={preferredPoint === 'p2'}
                    onChange={() => setPreferredPoint('p2')}
                  />{' '}
                  P2
                </label>
              </div>
              <span className="help-text">
                Area closer to the OTHER point will be shaded out.
              </span>
            </div>
          )}

          {selectedOption === 'areas' && (
            <div className="tool-section">
              <label>Operation</label>
              <div className="radio-group">
                <label className="radio-item">
                  <input
                    type="radio"
                    checked={areaOpType === 'inside'}
                    onChange={() => setAreaOpType('inside')}
                  />{' '}
                  Inside
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    checked={areaOpType === 'outside'}
                    onChange={() => setAreaOpType('outside')}
                  />{' '}
                  Outside
                </label>
              </div>
              <label style={{ marginTop: '10px' }}>Select Area Asset</label>
              <div className="file-input-wrapper">
                <select
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
                  <div className="success-badge">✓ Area Ready</div>
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
                  <div style={{ marginTop: '10px' }}>
                    <label>Select Specific Area</label>
                    <select
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
                            Area {listIdx + 1}{' '}
                            {item.feat.properties?.name
                              ? `(${item.feat.properties.name})`
                              : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
            </div>
          )}

          {selectedOption === 'closer-to-line' && (
            <div className="tool-section">
              <label>Hider is...</label>
              <div className="radio-group">
                <label className="radio-item">
                  <input
                    type="radio"
                    checked={closerFurther === 'closer'}
                    onChange={() => setCloserFurther('closer')}
                  />{' '}
                  Closer
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    checked={closerFurther === 'further'}
                    onChange={() => setCloserFurther('further')}
                  />{' '}
                  Further
                </label>
              </div>
              <label style={{ marginTop: '10px' }}>Select Line Asset</label>
              <div className="file-input-wrapper">
                <select
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
                  <div className="success-badge">✓ Line Ready</div>
                )}
              </div>

              {multiLineStringForOp &&
                multiLineStringForOp.type === 'FeatureCollection' &&
                multiLineStringForOp.features.length > 1 && (
                  <div style={{ marginTop: '10px' }}>
                    <label>Select Specific Line</label>
                    <select
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
                            Line {item.idx + 1}{' '}
                            {item.feat.properties?.name
                              ? `(${item.feat.properties.name})`
                              : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

              <span className="help-text">
                Set Seeker position (P1) on clicking map.
              </span>
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
            <button
              className="save-btn"
              onClick={handleSaveOperation}
              disabled={
                !selectedOption ||
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
        </div>
      )}

      {operations.length > 0 && (
        <div
          className="operations-container"
          style={{
            marginTop: 'auto',
            borderTop: '2px solid #eee',
            paddingTop: '20px',
          }}
        >
          <h3>Saved Operations</h3>
          <ul className="operations-list">
            {operations.map((op, index) => {
              const isDraft = !serverOperations.some(serverOp => serverOp.id === op.id);
              
              const handleSaveDraft = async () => {
                if (!createFactMutation || !gameId) return;
                
                try {
                  // Convert operation to fact info
                  const factInfo = convertOperationToFactInfo(op);
                  
                  // Get the selected team ID for the fact
                  const teamId = selectedTeamFilter === 'all' ? teamsData[0]?.team_id : selectedTeamFilter;
                  
                  if (!teamId) {
                    alert('Please select a team before saving.');
                    return;
                  }
                  
                  // Get team name for display
                  const teamName = teamsData.find(team => team.team_id === teamId)?.team_name || 'Unknown Team';
                  
                  // Create the fact with the correct format including player and team info
                  await createFactMutation({
                    game_id: gameId,
                    fact_type: 'GEO',
                    team_id: teamId,
                    fact_info: {
                      op_type: op.type,
                      op_meta: {
                        ...factInfo,
                        team_id: teamId,
                        team_name: teamName,
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
              };
              
              return (
                <li key={op.id} className="operation-card">
                  <strong>
                    {index + 1}.{' '}
                    {op.type === 'areas'
                      ? 'Area Operations'
                      : op.type === 'closer-to-line'
                        ? 'Distance from Metro Line'
                        : op.type.replace(/-/g, ' ')}
                    {isDraft && ' (Draft)'}
                  </strong>
                  <div className="help-text">
                    {op.type === 'draw-circle' &&
                      `${op.radius}km · Hider ${op.hiderLocation}`}
                    {op.type === 'split-by-direction' &&
                      `Hider is ${op.splitDirection}`}
                    {op.type === 'hotter-colder' &&
                      `Closer to ${op.preferredPoint}`}
                    {op.type === 'areas' &&
                      `${op.areaOpType}${op.selectedLineIndex !== undefined ? ` (Area ${op.selectedLineIndex + 1})` : ''}`}
                    {op.type === 'closer-to-line' &&
                      `${op.closerFurther} than Seeker ${op.selectedLineIndex !== undefined ? `(Line ${op.selectedLineIndex + 1})` : ''}`}
                    {op.type === 'polygon-location' && `In polygon`}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {isDraft && (
                      <button
                        className="save-draft-btn"
                        onClick={handleSaveDraft}
                      >
                        Save
                      </button>
                    )}
                    <button
                      className="remove-op"
                      onClick={() => removeOperation(op.id)}
                      style={{ position: 'relative', right: 'auto', top: 'auto' }}
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {referencePoints && referencePoints.length > 0 && (
        <div
          className="operations-container"
          style={{
            marginTop: '10px',
            borderTop: '2px solid #eee',
            paddingTop: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3>Reference Locations</h3>
            {onClearReferencePoints && (
              <button
                className="clear-btn"
                onClick={onClearReferencePoints}
                style={{ fontSize: '0.8rem', padding: '2px 8px' }}
              >
                Clear
              </button>
            )}
          </div>
          <ul className="operations-list" style={{ marginTop: '10px' }}>
            {referencePoints.map((point: number[], index: number) => (
              <li
                key={index}
                className="operation-card"
                style={{ padding: '8px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '24px',
                      backgroundColor: '#FF5722',
                      color: 'white',
                      borderRadius: '50% 50% 50% 0',
                      transform: 'rotate(-45deg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ transform: 'rotate(45deg)' }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      Location {String.fromCharCode(65 + index)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      {point[1].toFixed(5)}, {point[0].toFixed(5)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {allFacts && allFacts.length > 0 && (
        <div
          className="operations-container"
          style={{
            marginTop: '10px',
            borderTop: '2px solid #eee',
            paddingTop: '20px',
          }}
        >
          <h3>Saved Facts</h3>
          <ul className="operations-list" style={{ marginTop: '10px' }}>
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
              
              // Helper function to render operation details like saved operations
              const renderOperationDetails = (opType: string, opMeta: any) => {
                switch (opType) {
                  case 'draw-circle':
                    return `${opMeta.radius}km · Hider ${opMeta.hiderLocation}`;
                  case 'split-by-direction':
                    return `Hider is ${opMeta.splitDirection}`;
                  case 'hotter-colder':
                    return `Closer to ${opMeta.preferredPoint}`;
                  case 'areas':
                    return `${opMeta.areaOpType}${opMeta.selectedLineIndex !== undefined ? ` (Area ${opMeta.selectedLineIndex + 1})` : ''}`;
                  case 'closer-to-line':
                    return `${opMeta.closerFurther} than Seeker ${opMeta.selectedLineIndex !== undefined ? `(Line ${opMeta.selectedLineIndex + 1})` : ''}`;
                  case 'polygon-location':
                    return `In polygon`;
                  default:
                    return opType.replace(/-/g, ' ');
                }
              };

              return (
                <li key={fact.fact_id} className="operation-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{index + 1}. {
                        fact.fact_type === 'GEO' 
                          ? (fact.fact_info.op_type 
                              ? fact.fact_info.op_type.replace(/-/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())
                              : 'Map Operation')
                          : (fact.fact_info.op_meta?.text || 'Text Fact')
                      }</strong>
                      <div className="help-text" style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#333' }}>
                        {fact.fact_type === 'GEO' 
                          ? renderOperationDetails(fact.fact_info.op_type || '', fact.fact_info.op_meta || {})
                          : (fact.fact_info.op_meta?.text || 'No text content')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>
                        {fact.fact_info.op_meta?.player_name || 'Unknown'} - {fact.fact_info.op_meta?.team_name || 'Unknown Team'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#999', marginTop: '2px' }}>
                        {formatDate(fact.created)}
                      </div>
                    </div>
                    <button
                      className="delete-fact-btn"
                      onClick={handleDeleteFact}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
