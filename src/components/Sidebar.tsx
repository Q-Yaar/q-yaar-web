import React, { useState } from 'react';
import './Sidebar.css';
import { Operation, Fact } from '../utils/geoTypes';
import { convertFactToOperation, convertOperationToFact, mergeFacts } from '../utils/factUtils';

const PUBLIC_ASSETS = [
    { name: 'Bengaluru Urban District', path: '/assets/geojsons/bengaluru/bengaluru_urban_district.geojson' },
    { name: 'Bengaluru Corporations', path: '/assets/geojsons/bengaluru/bengaluru-corporations.geojson' },
    { name: 'Metro Lines', path: '/assets/geojsons/bengaluru/metro_lines.geojson' },
    { name: 'Metro Nearest Regions', path: '/assets/geojsons/bengaluru/metro_nearest_regions.geojson' },
];

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
    gameId?: string;
    teamId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    onSelectOption, points, distance, heading,
    radius, setRadius, hiderLocation, setHiderLocation,
    playArea, setPlayArea,
    splitDirection, setSplitDirection,
    preferredPoint, setPreferredPoint,
    areaOpType, setAreaOpType,
    uploadedAreaForOp, setUploadedAreaForOp,
    multiLineStringForOp, setMultiLineStringForOp,
    closerFurther, setCloserFurther,
    selectedLineIndex, setSelectedLineIndex,

    polygonGeoJSONForOp, setPolygonGeoJSONForOp,
    operations, setOperations,
    setPoints,
    gameId = 'default-game',
    teamId = 'default-team'
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
            alert("Failed to load GeoJSON asset");
        }
    };

    const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
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
        if (selectedOption !== 'areas' && selectedOption !== 'closer-to-line' && points.length === 0) return;
        if (selectedOption === 'closer-to-line' && (!multiLineStringForOp || points.length === 0)) return;
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
            timestamp: Date.now()
        };

        setOperations([...operations, newOp]);
    };

    const handleSyncFacts = () => {
        // This would eventually be a fetch call to the backend
        // For now, let's simulate by using a file picker to "import"
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event: any) => {
                try {
                    const remoteFacts: Fact[] = JSON.parse(event.target.result);
                    const localFacts = operations.map(op => convertOperationToFact(op, gameId, teamId));
                    if (playArea) {
                        localFacts.unshift(convertOperationToFact(playArea, gameId, teamId, true));
                    }

                    const mergedFacts = mergeFacts(localFacts, remoteFacts);

                    // Extract Play Area if present
                    const playAreaFact = mergedFacts.find(f => f.operation === 'play-area');
                    if (playAreaFact) {
                        setPlayArea(playAreaFact.parameters.playArea);
                    }

                    const newOperations = mergedFacts
                        .filter(f => f.operation !== 'play-area')
                        .map(f => convertFactToOperation(f))
                        .filter((op): op is Operation => op !== null);

                    setOperations(newOperations);
                    alert("Facts synchronized successfully!");
                } catch (err) {
                    console.error("Failed to parse facts:", err);
                    alert("Invalid JSON format");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleExportFacts = () => {
        const facts = operations.map(op => convertOperationToFact(op, gameId, teamId));
        if (playArea) {
            facts.unshift(convertOperationToFact(playArea, gameId, teamId, true));
        }
        const blob = new Blob([JSON.stringify(facts, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facts-${gameId}-${teamId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const removeOperation = (id: string) => {
        setOperations(operations.filter(op => op.id !== id));
    };

    return (
        <div className="sidebar">
            <header>
                <h2>Map Tools</h2>
                <div className="sync-buttons">
                    <button className="sync-btn" onClick={handleSyncFacts} title="Sync with backend">Sync</button>
                    <button className="export-btn" onClick={handleExportFacts} title="Download facts">Export</button>
                </div>
            </header>

            <section className="tool-section">
                <label>Play Area (Optional)</label>
                <div className="file-input-wrapper">
                    <select
                        onChange={(e) => {
                            const path = e.target.value;
                            if (path) {
                                fetchGeoJSON(path, setPlayArea);
                            } else {
                                setPlayArea(null);
                            }
                        }}
                        value={playArea?._source_path || ''}
                    >
                        <option value="">Default (Viewport)</option>
                        {PUBLIC_ASSETS.map(asset => (
                            <option key={asset.path} value={asset.path}>{asset.name}</option>
                        ))}
                    </select>
                    {playArea && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                            <div className="success-badge">✓ Area Loaded</div>
                            <button
                                onClick={() => setPlayArea(null)}
                                className="clear-btn"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <div className="divider" />

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
                    {/* Points Information */}
                    {(selectedOption !== 'areas' && points.length > 0) && (
                        <div className="info-box" style={{ marginBottom: '15px' }}>
                            <div>
                                <strong>{(selectedOption === 'draw-circle' || selectedOption === 'split-by-direction') ? 'Center' : 'Point 1'}:</strong>{' '}
                                {points[0][1].toFixed(4)}, {points[0][0].toFixed(4)}
                            </div>
                            {points.length > 1 && selectedOption !== 'draw-circle' && selectedOption !== 'split-by-direction' && (
                                <div style={{ marginTop: '5px' }}>
                                    <strong>Point 2:</strong> {points[1][1].toFixed(4)}, {points[1][0].toFixed(4)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Result Information */}
                    {selectedOption === 'distance' && distance !== null && (
                        <div className="info-box" style={{ borderColor: '#4CAF50', backgroundColor: '#f0fff4', marginBottom: '15px' }}>
                            <strong>Distance:</strong> {distance.toFixed(2)} km
                        </div>
                    )}

                    {selectedOption === 'heading' && heading && (
                        <div className="info-box" style={{ borderColor: '#2196F3', backgroundColor: '#e3f2fd', marginBottom: '15px' }}>
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
                                    <input type="radio" checked={hiderLocation === 'inside'} onChange={() => setHiderLocation('inside')} /> Inside
                                </label>
                                <label className="radio-item">
                                    <input type="radio" checked={hiderLocation === 'outside'} onChange={() => setHiderLocation('outside')} /> Outside
                                </label>
                            </div>
                        </div>
                    )}

                    {selectedOption === 'split-by-direction' && (
                        <div className="tool-section">
                            <label>Hider is toward...</label>
                            <select value={splitDirection} onChange={(e) => setSplitDirection(e.target.value as any)}>
                                <option value="North">North</option>
                                <option value="South">South</option>
                                <option value="East">East</option>
                                <option value="West">West</option>
                            </select>
                            <span className="help-text">Opposite side will be shaded out.</span>
                        </div>
                    )}

                    {selectedOption === 'hotter-colder' && (
                        <div className="tool-section">
                            <label>Closer to...</label>
                            <div className="radio-group">
                                <label className="radio-item">
                                    <input type="radio" checked={preferredPoint === 'p1'} onChange={() => setPreferredPoint('p1')} /> P1
                                </label>
                                <label className="radio-item">
                                    <input type="radio" checked={preferredPoint === 'p2'} onChange={() => setPreferredPoint('p2')} /> P2
                                </label>
                            </div>
                            <span className="help-text">Area closer to the OTHER point will be shaded out.</span>
                        </div>
                    )}

                    {selectedOption === 'areas' && (
                        <div className="tool-section">
                            <label>Operation</label>
                            <div className="radio-group">
                                <label className="radio-item">
                                    <input type="radio" checked={areaOpType === 'inside'} onChange={() => setAreaOpType('inside')} /> Inside
                                </label>
                                <label className="radio-item">
                                    <input type="radio" checked={areaOpType === 'outside'} onChange={() => setAreaOpType('outside')} /> Outside
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
                                    {PUBLIC_ASSETS.map(asset => (
                                        <option key={asset.path} value={asset.path}>{asset.name}</option>
                                    ))}
                                </select>
                                {uploadedAreaForOp && <div className="success-badge">✓ Area Ready</div>}
                            </div>

                            {uploadedAreaForOp && (uploadedAreaForOp.type === 'FeatureCollection') && uploadedAreaForOp.features.filter((f: any) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')).length > 1 && (
                                <div style={{ marginTop: '10px' }}>
                                    <label>Select Specific Area</label>
                                    <select
                                        value={selectedLineIndex}
                                        onChange={(e) => setSelectedLineIndex(parseInt(e.target.value) || 0)}
                                    >
                                        {uploadedAreaForOp.features
                                            .map((feat: any, idx: number) => ({ feat, idx }))
                                            .filter((item: any) => item.feat.geometry && (item.feat.geometry.type === 'Polygon' || item.feat.geometry.type === 'MultiPolygon'))
                                            .map((item: any, listIdx: number) => (
                                                <option key={item.idx} value={item.idx}>
                                                    Area {listIdx + 1} {item.feat.properties?.name ? `(${item.feat.properties.name})` : ''}
                                                </option>
                                            ))
                                        }
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
                                    <input type="radio" checked={closerFurther === 'closer'} onChange={() => setCloserFurther('closer')} /> Closer
                                </label>
                                <label className="radio-item">
                                    <input type="radio" checked={closerFurther === 'further'} onChange={() => setCloserFurther('further')} /> Further
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
                                    {PUBLIC_ASSETS.map(asset => (
                                        <option key={asset.path} value={asset.path}>{asset.name}</option>
                                    ))}
                                </select>
                                {multiLineStringForOp && <div className="success-badge">✓ Line Ready</div>}
                            </div>

                            {multiLineStringForOp && (multiLineStringForOp.type === 'FeatureCollection') && multiLineStringForOp.features.length > 1 && (
                                <div style={{ marginTop: '10px' }}>
                                    <label>Select Specific Line</label>
                                    <select
                                        value={selectedLineIndex}
                                        onChange={(e) => setSelectedLineIndex(parseInt(e.target.value) || 0)}
                                    >
                                        {multiLineStringForOp.features
                                            .map((feat: any, idx: number) => ({ feat, idx }))
                                            .filter((item: any) => item.feat.geometry.type === 'LineString' || item.feat.geometry.type === 'MultiLineString')
                                            .map((item: any) => (
                                                <option key={item.idx} value={item.idx}>
                                                    Line {item.idx + 1} {item.feat.properties?.name ? `(${item.feat.properties.name})` : ''}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                            )}

                            <span className="help-text">Set Seeker position (P1) on clicking map.</span>
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
                                    {PUBLIC_ASSETS.map(asset => (
                                        <option key={asset.path} value={asset.path}>{asset.name}</option>
                                    ))}
                                </select>
                                {polygonGeoJSONForOp && <div className="success-badge">✓ Polygons Ready</div>}
                            </div>

                            {points.length > 0 && polygonGeoJSONForOp && (
                                <div className="info-box" style={{ marginTop: '10px', backgroundColor: '#f9f9f9' }}>
                                    {(() => {
                                        const { findContainingPolygon } = require('../utils/geoUtils');
                                        const found = findContainingPolygon(points[0], polygonGeoJSONForOp);
                                        if (found) {
                                            return (
                                                <>
                                                    <strong>Containing Polygon Attributes:</strong>
                                                    <pre style={{ fontSize: '0.75rem', marginTop: '5px', overflowX: 'auto' }}>
                                                        {JSON.stringify(found.properties, null, 2)}
                                                    </pre>
                                                </>
                                            );
                                        }
                                        return <i>Point is not inside any polygon.</i>;
                                    })()}
                                </div>
                            )}
                            <span className="help-text">Click on map to set your location (P1).</span>
                        </div>
                    )}


                    {selectedCategory === 'facts' && (
                        <button
                            className="save-btn"
                            onClick={handleSaveOperation}
                            disabled={
                                !selectedOption ||
                                (selectedOption === 'areas' && !uploadedAreaForOp) ||
                                (selectedOption === 'closer-to-line' && (!multiLineStringForOp || points.length === 0)) ||
                                (selectedOption === 'polygon-location' && (!polygonGeoJSONForOp || points.length === 0)) ||
                                (['draw-circle', 'split-by-direction', 'hotter-colder'].includes(selectedOption) && points.length === 0)
                            }
                        >
                            Save Operation
                        </button>
                    )}
                </div>
            )}

            {operations.length > 0 && (
                <div className="operations-container" style={{ marginTop: 'auto', borderTop: '2px solid #eee', paddingTop: '20px' }}>
                    <h3>Saved Operations</h3>
                    <ul className="operations-list">
                        {operations.map((op, index) => (
                            <li key={op.id} className="operation-card">
                                <strong>{index + 1}. {op.type === 'areas' ? 'Area Operations' : (op.type === 'closer-to-line' ? 'Distance from Metro Line' : op.type.replace(/-/g, ' '))}</strong>
                                <div className="help-text">
                                    {op.type === 'draw-circle' && `${op.radius}km · Hider ${op.hiderLocation}`}
                                    {op.type === 'split-by-direction' && `Hider is ${op.splitDirection}`}
                                    {op.type === 'hotter-colder' && `Closer to ${op.preferredPoint}`}
                                    {op.type === 'areas' && `${op.areaOpType}${op.selectedLineIndex !== undefined ? ` (Area ${op.selectedLineIndex + 1})` : ''}`}
                                    {op.type === 'closer-to-line' && `${op.closerFurther} than Seeker ${op.selectedLineIndex !== undefined ? `(Line ${op.selectedLineIndex + 1})` : ''}`}
                                    {op.type === 'polygon-location' && `In polygon`}
                                </div>
                                <button className="remove-op" onClick={() => removeOperation(op.id)}>×</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
