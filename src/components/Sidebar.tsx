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
        onSelectOption(''); // Reset current action when category changes
    };

    const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        setSelectedOption(value);
        onSelectOption(value);
    };

    const handleSaveOperation = () => {
        if (!selectedOption || points.length === 0) return;

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
        // We don't necessarily reset points here, user might want to adjust and save again
        // but typically they'd move to the next tool.
    };

    const removeOperation = (id: string) => {
        setOperations(operations.filter(op => op.id !== id));
    };

    return (
        <div className="sidebar">
            <h2>Map Tools</h2>

            <div style={{ marginBottom: '10px' }}>
                <label><strong>Category:</strong></label>
                <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                >
                    <option value="">Select Category</option>
                    <option value="questions">Questions</option>
                    <option value="facts">Facts</option>
                </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label><strong>Tool:</strong></label>
                <select
                    value={selectedOption}
                    onChange={handleOptionChange}
                    disabled={!selectedCategory}
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                >
                    <option value="">Select Action</option>
                    {selectedCategory === 'questions' && (
                        <>
                            <option value="distance">Distance Between Two Points</option>
                            <option value="heading">Relative Heading Between Two Points</option>
                        </>
                    )}
                    {selectedCategory === 'facts' && (
                        <>
                            <option value="draw-circle">Draw Circle</option>
                            <option value="split-by-direction">Split by Direction</option>
                            <option value="hotter-colder">Hotter/Colder</option>
                            <option value="areas">Areas (Upload GeoJSON)</option>
                        </>
                    )}
                </select>
            </div>

            {(selectedOption === 'distance' || selectedOption === 'heading' || selectedOption === 'draw-circle' || selectedOption === 'split-by-direction' || selectedOption === 'hotter-colder' || selectedOption === 'areas') && (
                <div style={{ marginTop: '20px' }}>
                    {(selectedOption !== 'areas') && points && points.length > 0 && (
                        <div>
                            <strong>{(selectedOption === 'draw-circle' || selectedOption === 'split-by-direction') ? 'Center Point:' : 'Point 1:'}</strong> <br />
                            {points[0] ? `[${points[0][1].toFixed(4)}, ${points[0][0].toFixed(4)}]` : ''}
                        </div>
                    )}
                    {(selectedOption !== 'draw-circle' && selectedOption !== 'split-by-direction' && selectedOption !== 'areas') && points && points.length > 1 && (
                        <div style={{ marginTop: '10px' }}>
                            <strong>Point 2:</strong> <br />
                            {points[1] ? `[${points[1][1].toFixed(4)}, ${points[1][0].toFixed(4)}]` : ''}
                        </div>
                    )}
                    {selectedOption === 'distance' && distance !== null && (
                        <div style={{ marginTop: '10px', color: 'green' }}>
                            <strong>Distance:</strong> {distance.toFixed(2)} km
                        </div>
                    )}
                    {selectedOption === 'heading' && heading && (
                        <div style={{ marginTop: '10px', color: 'blue' }}>
                            <div><strong>Relative Heading:</strong></div>
                            <div>P1 is {heading.lat} of P2</div>
                            <div>P1 is {heading.lon} of P2</div>
                        </div>
                    )}
                    {selectedOption === 'draw-circle' && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label><strong>Radius (km):</strong></label><br />
                                <input
                                    type="number"
                                    value={radius}
                                    onChange={(e) => setRadius(parseFloat(e.target.value) || 0)}
                                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label><strong>Shading:</strong></label><br />
                                <div style={{ marginTop: '5px' }}>
                                    <label>
                                        <input
                                            type="radio"
                                            value="inside"
                                            checked={shadingMode === 'inside'}
                                            onChange={() => setShadingMode('inside')}
                                        /> Inside
                                    </label>
                                    <label style={{ marginLeft: '10px' }}>
                                        <input
                                            type="radio"
                                            value="outside"
                                            checked={shadingMode === 'outside'}
                                            onChange={() => setShadingMode('outside')}
                                        /> Outside
                                    </label>
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label><strong>Upload Play Area:</strong></label><br />
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
                                                } catch (err) {
                                                    alert("Invalid GeoJSON file");
                                                }
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                                {playArea && <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>✓ Play area uploaded</div>}
                            </div>
                        </div>
                    )}
                    {selectedOption === 'split-by-direction' && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label><strong>Split Direction:</strong></label><br />
                                <select
                                    value={splitDirection}
                                    onChange={(e) => setSplitDirection(e.target.value as any)}
                                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                                >
                                    <option value="North">North (Hider is North)</option>
                                    <option value="South">South (Hider is South)</option>
                                    <option value="East">East (Hider is East)</option>
                                    <option value="West">West (Hider is West)</option>
                                </select>
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                                    The hider is on the selected side. The opposite side will be shaded.
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label><strong>Upload Play Area:</strong></label><br />
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
                                                } catch (err) {
                                                    alert("Invalid GeoJSON file");
                                                }
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                                {playArea && <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>✓ Play area uploaded</div>}
                                {!playArea && <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Defaults to visible area if not provided</div>}
                            </div>
                        </div>
                    )}
                    {selectedOption === 'areas' && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label><strong>Operation Type:</strong></label><br />
                                <div style={{ marginTop: '5px' }}>
                                    <label>
                                        <input
                                            type="radio"
                                            value="intersection"
                                            checked={areaOpType === 'intersection'}
                                            onChange={() => setAreaOpType('intersection')}
                                        /> Intersection
                                    </label>
                                    <label style={{ marginLeft: '10px' }}>
                                        <input
                                            type="radio"
                                            value="difference"
                                            checked={areaOpType === 'difference'}
                                            onChange={() => setAreaOpType('difference')}
                                        /> Difference
                                    </label>
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label><strong>Upload Area GeoJSON:</strong></label><br />
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
                                                } catch (err) {
                                                    alert("Invalid GeoJSON file");
                                                }
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                    style={{ width: '100%', marginTop: '5px' }}
                                />
                                {uploadedAreaForOp && <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>✓ Area uploaded</div>}
                            </div>
                        </div>
                    )}

                    {selectedCategory === 'facts' && (
                        <div style={{ marginTop: '20px' }}>
                            <button
                                onClick={handleSaveOperation}
                                disabled={!selectedOption || (selectedOption !== 'areas' && points.length === 0) || (selectedOption === 'areas' && !uploadedAreaForOp)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Save Operation
                            </button>
                        </div>
                    )}
                </div>
            )}

            {operations.length > 0 && (
                <div style={{ marginTop: '30px', borderTop: '2px solid #333', paddingTop: '15px' }}>
                    <h3>Saved Operations</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {operations.map((op, index) => (
                            <li key={op.id} style={{
                                marginBottom: '10px',
                                padding: '10px',
                                backgroundColor: '#f9f9f9',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                position: 'relative'
                            }}>
                                <strong>{index + 1}. {op.type}</strong>
                                <div style={{ fontSize: '11px', marginTop: '3px' }}>
                                    {op.type === 'draw-circle' && `Radius: ${op.radius}km, ${op.shadingMode}`}
                                    {op.type === 'split-by-direction' && `Direction: ${op.splitDirection}`}
                                    {op.type === 'hotter-colder' && `Preferred: ${op.preferredPoint}`}
                                    {op.type === 'areas' && `Area Op: ${op.areaOpType}`}
                                </div>
                                <button
                                    onClick={() => removeOperation(op.id)}
                                    style={{
                                        position: 'absolute',
                                        right: '5px',
                                        top: '5px',
                                        background: 'none',
                                        border: 'none',
                                        color: 'red',
                                        cursor: 'pointer',
                                        fontSize: '16px'
                                    }}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
