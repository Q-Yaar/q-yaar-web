import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface ToolConfigurationFormsProps {
  selectedOption: string;
  points: number[][];
  distance: number | null;
  heading: { lat: string; lon: string } | null;
  radius: number;
  setRadius: (radius: number) => void;
  hiderLocation: 'inside' | 'outside';
  setHiderLocation: (mode: 'inside' | 'outside') => void;
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
  textFactContent: string;
  setTextFactContent: (content: string) => void;
  OPERATION_ASSETS: any;
  fetchGeoJSON: (path: string, setter: (data: any) => void) => void;
}

export const ToolConfigurationForms: React.FC<ToolConfigurationFormsProps> = ({
  selectedOption,
  points,
  distance,
  heading,
  radius,
  setRadius,
  hiderLocation,
  setHiderLocation,
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
  textFactContent,
  setTextFactContent,
  OPERATION_ASSETS,
  fetchGeoJSON
}) => {
  if (!selectedOption) return null;

  return (
    <>
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
            {heading ? `P1 is ${heading.lat} and ${heading.lon} of P2` : 'Click to set two points'}
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
                {OPERATION_ASSETS['areas'].map((asset: any) => (
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
          </div>
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
                {OPERATION_ASSETS['closer-to-line'].map((asset: any) => (
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
              {OPERATION_ASSETS['polygon-location'].map((asset: any) => (
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
                } = require('../../utils/geoUtils');
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
    </>
  );
};
