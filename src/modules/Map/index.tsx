import React, { useState } from 'react';
import Map from '../../components/Map';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { Heading, Operation } from '../../utils/geoTypes';

const MapPage: React.FC = () => {
    const [action, setAction] = useState<string>('');
    const [points, setPoints] = useState<number[][]>([]);
    const [distance, setDistance] = useState<number | null>(null);
    const [heading, setHeading] = useState<Heading | null>(null);
    const [radius, setRadius] = useState<number>(5);
    const [shadingMode, setShadingMode] = useState<'inside' | 'outside'>('outside');
    const [playArea, setPlayArea] = useState<any>(null);
    const [splitDirection, setSplitDirection] = useState<'North' | 'South' | 'East' | 'West'>('North');
    const [preferredPoint, setPreferredPoint] = useState<'p1' | 'p2'>('p1');
    const [areaOpType, setAreaOpType] = useState<'intersection' | 'difference'>('intersection');
    const [uploadedAreaForOp, setUploadedAreaForOp] = useState<any>(null);
    const [operations, setOperations] = useState<Operation[]>([]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <Navbar />
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ width: '350px', height: '100%', overflowY: 'auto', borderRight: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
                    <Sidebar
                        onSelectOption={setAction}
                        points={points}
                        distance={distance}
                        heading={heading}
                        radius={radius}
                        setRadius={setRadius}
                        shadingMode={shadingMode}
                        setShadingMode={setShadingMode}
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
                        operations={operations}
                        setOperations={setOperations}
                    />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Map
                        action={action}
                        points={points}
                        setPoints={setPoints}
                        setDistance={setDistance}
                        setHeading={setHeading}
                        radius={radius}
                        shadingMode={shadingMode}
                        playArea={playArea}
                        splitDirection={splitDirection}
                        preferredPoint={preferredPoint}
                        areaOpType={areaOpType}
                        uploadedAreaForOp={uploadedAreaForOp}
                        operations={operations}
                    />
                </div>
            </div>
        </div>
    );
};

export default MapPage;
