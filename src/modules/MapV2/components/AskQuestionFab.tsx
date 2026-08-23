import React from 'react';
import { Plus } from 'lucide-react';

interface AskQuestionFabProps {
  onClick: () => void;
}

/** The map's one primary create action — bottom-right, thumb-reachable, the
 * standard mobile FAB placement — rather than one entry in a floating
 * button stack competing with everything else for attention. Small and
 * glassy (a gradient pill with a light top edge) rather than a big flat
 * block, so it reads as a control floating over the map, not a banner. */
export const AskQuestionFab: React.FC<AskQuestionFabProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Ask a question"
    style={{
      position: 'absolute',
      right: '14px',
      bottom: 'calc(14px + env(safe-area-inset-bottom))',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '9px 14px',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'linear-gradient(135deg, #3B82F6, #276EF1 60%, #1E56D6)',
      color: '#ffffff',
      fontSize: '12.5px',
      fontWeight: 700,
      boxShadow: '0 4px 16px rgba(39,110,241,0.45), inset 0 1px 0 rgba(255,255,255,0.35)',
      cursor: 'pointer',
    }}
  >
    <Plus size={15} />
    Ask a question
  </button>
);
