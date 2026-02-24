import React from 'react';

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
    <div
      className="operations-container"
      style={{
        marginTop: '10px',
        borderTop: '2px solid #eee',
        paddingTop: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3>Reference Locations</h3>
        {onClearReferencePoints && (
          <button
            className="clear-btn"
            onClick={onClearReferencePoints}
            style={{ fontSize: '0.8rem', padding: '2px 8px' }}
          >
            Clear
          </button>
        )}
      </div>
      <ul className="operations-list" style={{ marginTop: '10px' }}>
        {referencePoints.map((point: number[], index: number) => (
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
                  backgroundColor: '#FF5722',
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
                  {String.fromCharCode(65 + index)}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  Location {String.fromCharCode(65 + index)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  {point[1].toFixed(5)}, {point[0].toFixed(5)}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};