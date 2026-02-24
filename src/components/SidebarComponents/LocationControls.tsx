import React from 'react';

interface LocationControlsProps {
  selectedOption: string;
  points: number[][];
  currentLocation: number[] | null | undefined;
  handleUseCurrentLocation: (targetIndex?: number) => void;
  isTwoPointTool: boolean;
}

export const LocationControls: React.FC<LocationControlsProps> = ({
  selectedOption,
  points,
  currentLocation,
  handleUseCurrentLocation,
  isTwoPointTool
}) => {
  if (!selectedOption || selectedOption === 'areas') return null;

  return (
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
  );
};