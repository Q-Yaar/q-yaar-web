import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MapCanvas } from './MapCanvas';
import { uberDark } from './theme';

/**
 * Entry point for the revamped map — the group/module/item layer
 * architecture, loading real Facts for this game (converted from the
 * legacy op_type shape by factsV2/legacyFactConverter.ts until the backend
 * serves FactsV2-shaped facts directly). Lives entirely under
 * src/modules/MapV2 so the existing Map page (src/modules/Map) is
 * untouched.
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
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: uberDark.surface,
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          backgroundColor: uberDark.surfaceElevated,
          border: `1px solid ${uberDark.border}`,
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={24} color={uberDark.textPrimary} />
      </button>

      <MapCanvas gameId={gameId} />
    </div>
  );
};

export default MapV2Page;
