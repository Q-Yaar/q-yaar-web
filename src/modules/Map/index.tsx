import React, { useState } from 'react';
import Map from '../../components/Map';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { Heading, Operation } from '../../utils/geoTypes';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';

const MapPage: React.FC = () => {
    const { gameId } = useParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(window.innerWidth > 768);
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
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                    width: isSidebarOpen ? '380px' : '0px',
                    height: '100%',
                    overflowY: 'auto',
                    zIndex: 10,
                    transition: 'width 0.3s ease-in-out',
                    borderRight: isSidebarOpen ? '1px solid #ddd' : 'none',
                    backgroundColor: 'white', // Ensure background is white so it covers anything behind if needed (though map is next to it)
                    flexShrink: 0
                }}>
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
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            zIndex: 1000,
                            backgroundColor: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                    >
                        {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
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
                    />
                </div>
            </div>
        </div>
    );
};

export default MapPage;
