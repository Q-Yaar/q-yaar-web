import React from 'react';

interface PlayAreaSectionProps {
  playArea: any;
  setPlayArea: (area: any) => void;
  OPERATION_ASSETS: any;
  fetchGeoJSON: (path: string, setter: (data: any) => void) => void;
}

export const PlayAreaSection: React.FC<PlayAreaSectionProps> = ({
  playArea,
  setPlayArea,
  OPERATION_ASSETS,
  fetchGeoJSON
}) => {
  return (
    <section className="tool-section">
      <label>Play Area</label>
      <div className="file-input-wrapper">
        <select
          onChange={(e) => {
            const path = e.target.value;
            if (path) {
              fetchGeoJSON(path, setPlayArea);
            }
          }}
          value={playArea?._source_path || OPERATION_ASSETS['play-area'][0].path}
        >
          {OPERATION_ASSETS['play-area'].map((asset: any) => (
            <option key={asset.path} value={asset.path}>
              {asset.name}
            </option>
          ))}
        </select>
        {playArea && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginTop: '4px',
            }}
          >
            <div className="success-badge">✓ Bengaluru Urban District Applied</div>
          </div>
        )}
      </div>
    </section>
  );
};