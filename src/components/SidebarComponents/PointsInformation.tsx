import React from 'react';

interface PointsInformationProps {
  points: number[][];
  currentLocation: number[] | null | undefined;
  referencePoints: number[][];
  pointPOIInfo?: Array<{
    name?: string;
    type?: string;
    properties?: any;
  } | null>;
  showAlways?: boolean;
}

export const PointsInformation: React.FC<PointsInformationProps> = ({
  points,
  currentLocation,
  referencePoints,
  pointPOIInfo = [],
  showAlways = false
}) => {
  if (points.length === 0) return null;

  // Always show points information when showAlways is true
  // This makes PointsInformation the primary way to display point info
  if (!showAlways) {
    return null;
  }

  // Function to check if a point matches current location
  const isCurrentLocation = (point: number[]) => {
    if (!currentLocation) return false;
    return point[0] === currentLocation[0] && point[1] === currentLocation[1];
  };

  // Function to check if a point matches any reference point
  const isReferencePoint = (point: number[]) => {
    return referencePoints.some(refPoint => 
      refPoint[0] === point[0] && refPoint[1] === point[1]
    );
  };

  // Function to get reference point label (A, B, C, etc.)
  const getReferencePointLabel = (point: number[]) => {
    const index = referencePoints.findIndex(refPoint => 
      refPoint[0] === point[0] && refPoint[1] === point[1]
    );
    return index >= 0 ? String.fromCharCode(65 + index) : null;
  };

  return (
    <div
      className="operations-container"
      style={{
        marginTop: '10px',
        borderTop: '2px solid #eee',
        paddingTop: '20px',
      }}
    >
      <h3>Current Points Information</h3>
      <ul className="operations-list" style={{ marginTop: '10px' }}>
        {points.map((point: number[], index: number) => {
          const pointLabel = `P${index + 1}`;
          const isCurrentLoc = isCurrentLocation(point);
          const isRefPoint = isReferencePoint(point);
          const refLabel = isRefPoint ? getReferencePointLabel(point) : null;
          const poiInfo = pointPOIInfo[index] || null;
          const isPOI = poiInfo !== null;

          // Determine background color based on point type
          let bgColor = '#2196F3'; // Default: Custom Location (blue)
          if (isCurrentLoc) {
            bgColor = '#4CAF50'; // Current Location (green)
          } else if (isRefPoint) {
            bgColor = '#FF9800'; // Reference Point (orange)
          } else if (isPOI) {
            bgColor = '#9C27B0'; // POI (purple)
          }

          return (
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
                    backgroundColor: bgColor,
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
                    {pointLabel}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {pointLabel}: {isCurrentLoc ? 'Current Location' : isRefPoint ? `Reference Point ${refLabel}` : isPOI ? `POI: ${poiInfo?.name || 'Unnamed'}` : 'Custom Location'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    Lat: {point[1].toFixed(5)}, Lon: {point[0].toFixed(5)}
                  </div>
                  {isCurrentLoc && (
                    <div style={{ fontSize: '0.7rem', color: '#4CAF50', fontStyle: 'italic' }}>
                      (Your current GPS location)
                    </div>
                  )}
                  {isRefPoint && (
                    <div style={{ fontSize: '0.7rem', color: '#FF9800', fontStyle: 'italic' }}>
                      (Reference location {refLabel})
                    </div>
                  )}
                  {isPOI && poiInfo && (
                    <div style={{ fontSize: '0.7rem', color: '#9C27B0', fontStyle: 'italic' }}>
                      (Point of Interest: {poiInfo.type}) {poiInfo.properties?.description && ` - ${poiInfo.properties.description}`}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};