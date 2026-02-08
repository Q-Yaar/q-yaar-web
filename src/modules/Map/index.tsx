import React, { useState } from 'react';
import Map from '../../components/Map';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { Heading, Operation } from '../../utils/geoTypes';
import { useParams } from 'react-router-dom';

const MapPage: React.FC = () => {
    const { gameId } = useParams();
    const [action, setAction] = useState<string>('');
    const [points, setPoints] = useState<number[][]>([]);
    const [distance, setDistance] = useState<number | null>(null);
    const [heading, setHeading] = useState<Heading | null>(null);
    const [radius, setRadius] = useState<number>(5);
    const [hiderLocation, setHiderLocation] = useState<'inside' | 'outside'>('inside');
    const [playArea, setPlayArea] = useState<any>(null);
    const [splitDirection, setSplitDirection] = useState<'North' | 'South' | 'East' | 'West'>('North');
    const [preferredPoint, setPreferredPoint] = useState<'p1' | 'p2'>('p1');
    const [areaOpType, setAreaOpType] = useState<'inside' | 'outside'>('inside');
    const [uploadedAreaForOp, setUploadedAreaForOp] = useState<any>(null);
    const [multiLineStringForOp, setMultiLineStringForOp] = useState<any>(null);
    const [closerFurther, setCloserFurther] = useState<'closer' | 'further'>('closer');
    const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);
    const [polygonGeoJSON, setPolygonGeoJSON] = useState<any>(null);
    const [operations, setOperations] = useState<Operation[]>([]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <Navbar gameId={gameId} title="Interactive Game Map" />
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ width: '380px', height: '100%', overflowY: 'auto', zIndex: 10 }}>
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
                        setOperations={setOperations}
                        setPoints={setPoints}
                    />
                </div>
                <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
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
                    />
                </div>
            </div>
        </div>
    );
};

export default MapPage;
