import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapCanvas } from './MapCanvas';
import { uberDark } from './theme';

/**
 * Entry point for the revamped map — the group/module/item layer
 * architecture, loading real Facts for this game (factsV2/factV2Converter.ts
 * reads only the FactsV2-shaped ones — a fact from before this pipeline
 * existed doesn't convert and is dropped). Lives entirely under
 * src/modules/MapV2 so the existing Map page (src/modules/Map) is
 * untouched.
 *
 * A single flex column filling the viewport (100dvh, not 100vh — the
 * dynamic viewport unit that accounts for mobile browser chrome showing/
 * hiding) with nothing of its own between this and the map: the back
 * button lives in MapCanvas's TopBar now, as the first item in that same
 * flex row, rather than floating on top of the map as a separate layer.
 */
const MapV2Page: React.FC = () => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: uberDark.surface,
      }}
    >
      <MapCanvas gameId={gameId} onBack={() => navigate(-1)} />
    </div>
  );
};

export default MapV2Page;
