import React from 'react';
import { Button } from '../ui/button';

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
          <Button
            variant="default"
            className="flex-1"
            onClick={() => handleUseCurrentLocation(0)}
            disabled={!currentLocation}
            title={
              !currentLocation
                ? 'Waiting for location...'
                : 'Set Point 1 to Current Location'
            }
          >
            📍 Set P1
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => handleUseCurrentLocation(1)}
            disabled={!currentLocation || points.length === 0}
            title={
              !currentLocation
                ? 'Waiting for location...'
                : points.length === 0
                  ? 'Set P1 first'
                  : 'Set Point 2 to Current Location'
            }
          >
            📍 Set P2
          </Button>
        </div>
      ) : (
        <Button
          variant="default"
          className="w-full"
          onClick={() => handleUseCurrentLocation()}
          disabled={!currentLocation}
          title={
            !currentLocation
              ? 'Waiting for location...'
              : 'Use/Update Current Location as a Point'
          }
        >
          📍 Use Current Location
        </Button>
      )}
    </div>
  );
};