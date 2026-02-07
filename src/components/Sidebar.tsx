import React, { useState } from 'react';
import './Sidebar.css';
import { Operation } from '../utils/geoTypes';

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
    shadingMode: 'inside' | 'outside';
    setShadingMode: (mode: 'inside' | 'outside') => void;
    playArea: any;
    setPlayArea: (area: any) => void;
    splitDirection: 'North' | 'South' | 'East' | 'West';
    setSplitDirection: (dir: 'North' | 'South' | 'East' | 'West') => void;
    preferredPoint: 'p1' | 'p2';
    setPreferredPoint: (p: 'p1' | 'p2') => void;
    areaOpType: 'intersection' | 'difference';
    setAreaOpType: (type: 'intersection' | 'difference') => void;
    uploadedAreaForOp: any;
    setUploadedAreaForOp: (area: any) => void;
    operations: Operation[];
    setOperations: (ops: Operation[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    onSelectOption, points, distance, heading,
    radius, setRadius, shadingMode, setShadingMode,
    playArea, setPlayArea,
    splitDirection, setSplitDirection,
    preferredPoint, setPreferredPoint,
    areaOpType, setAreaOpType,
    uploadedAreaForOp, setUploadedAreaForOp,
    operations, setOperations
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedOption, setSelectedOption] = useState<string>('');

    const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const category = event.target.value;
        setSelectedCategory(category);
        setSelectedOption('');
        onSelectOption('');
    };

    const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setSelectedOption(value);
        onSelectOption(value);
    };

    const handleSaveOperation = () => {
        if (!selectedOption || (selectedOption !== 'areas' && points.length === 0)) return;

        const newOp: Operation = {
            id: Date.now().toString(),
            type: selectedOption as any,
            points: [...points],
            radius,
            shadingMode,
            splitDirection,
            preferredPoint,
            areaOpType,
            uploadedArea: uploadedAreaForOp
        };

        setOperations([...operations, newOp]);
    };

    const removeOperation = (id: string) => {
        setOperations(operations.filter(op => op.id !== id));
    };

    return (
        <div className="sidebar">
            <header>
                <h2>Map Tools</h2>
            </header>

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
                        </>
                    )}
                    {selectedCategory === 'facts' && (
                        <>
                            <option value="draw-circle">Draw Circle</option>
                            <option value="split-by-direction">Split by Direction</option>
                            <option value="hotter-colder">Hotter / Colder</option>
                            <option value="areas">Boolean Area Ops</option>
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
                            <label style={{ marginTop: '10px' }}>Shading</label>
                            <div className="radio-group">
                                <label className="radio-item">
                                    <input type="radio" checked={shadingMode === 'inside'} onChange={() => setShadingMode('inside')} /> Inside
                                </label>
                                <label className="radio-item">
                                    <input type="radio" checked={shadingMode === 'outside'} onChange={() => setShadingMode('outside')} /> Outside
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
                                    <input type="radio" checked={areaOpType === 'intersection'} onChange={() => setAreaOpType('intersection')} /> Intersection
                                </label>
                                <label className="radio-item">
                                    <input type="radio" checked={areaOpType === 'difference'} onChange={() => setAreaOpType('difference')} /> Difference
                                </label>
                            </div>
                            <label style={{ marginTop: '10px' }}>Upload GeoJSON</label>
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    accept=".json,.geojson"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                try {
                                                    const json = JSON.parse(event.target?.result as string);
                                                    setUploadedAreaForOp(json);
                                                } catch (err) { alert("Invalid GeoJSON"); }
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                />
                                {uploadedAreaForOp && <div className="success-badge">✓ Area Ready</div>}
                            </div>
                        </div>
                    )}

                    {/* Shared Play Area Upload */}
                    {(selectedOption === 'draw-circle' || selectedOption === 'split-by-direction' || selectedOption === 'hotter-colder') && (
                        <div className="tool-section" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                            <label>Restrict to Play Area</label>
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    accept=".json,.geojson"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                try {
                                                    const json = JSON.parse(event.target?.result as string);
                                                    setPlayArea(json);
                                                } catch (err) { alert("Invalid GeoJSON"); }
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                />
                                {playArea && <div className="success-badge">✓ Play Area Loaded</div>}
                                {!playArea && <span className="help-text">Optional. Defaults to viewport.</span>}
                            </div>
                        </div>
                    )}

                    {selectedCategory === 'facts' && (
                        <button
                            className="save-btn"
                            onClick={handleSaveOperation}
                            disabled={!selectedOption || (selectedOption !== 'areas' && points.length === 0) || (selectedOption === 'areas' && !uploadedAreaForOp)}
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
                                <strong>{index + 1}. {op.type.replace(/-/g, ' ')}</strong>
                                <div className="help-text">
                                    {op.type === 'draw-circle' && `${op.radius}km · ${op.shadingMode}`}
                                    {op.type === 'split-by-direction' && `Hider is ${op.splitDirection}`}
                                    {op.type === 'hotter-colder' && `Closer to ${op.preferredPoint}`}
                                    {op.type === 'areas' && `${op.areaOpType}`}
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
