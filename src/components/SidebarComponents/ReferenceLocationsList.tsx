import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface ReferenceLocationsListProps {
  referencePoints: number[][];
  onClearReferencePoints: (() => void) | undefined;
}

export const ReferenceLocationsList: React.FC<ReferenceLocationsListProps> = ({
  referencePoints,
  onClearReferencePoints
}) => {
  if (!referencePoints || referencePoints.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Reference Locations</h3>
        {onClearReferencePoints && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearReferencePoints}
            className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            Clear
          </Button>
        )}
      </div>

      <ul className="flex flex-col space-y-3">
        {referencePoints.map((point: number[], index: number) => (
          <li key={index}>
            <Card className="w-full shadow-sm border border-emerald-100 bg-emerald-50/30 rounded-xl overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl"></div>
              <CardContent className="p-3 pl-5 flex items-center text-left">
                <div
                  style={{
                    width: '20px',
                    height: '24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ transform: 'rotate(45deg)' }}>
                    {String.fromCharCode(65 + index)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800 tracking-tight">
                    Location {String.fromCharCode(65 + index)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 font-medium">
                    {point[1].toFixed(5)}, {point[0].toFixed(5)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
};