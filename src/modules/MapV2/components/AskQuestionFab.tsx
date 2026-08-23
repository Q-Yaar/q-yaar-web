import React from 'react';
import { Plus } from 'lucide-react';
import { uberDark } from '../theme';

interface AskQuestionFabProps {
  onClick: () => void;
}

/** The map's one primary create action — bottom-right, thumb-reachable, the
 * standard mobile FAB placement — rather than one entry in a floating
 * button stack competing with everything else for attention. */
export const AskQuestionFab: React.FC<AskQuestionFabProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Ask a question"
    style={{
      position: 'absolute',
      right: '16px',
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '14px 18px',
      borderRadius: '28px',
      border: 'none',
      backgroundColor: uberDark.accent,
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 700,
      boxShadow: '0 6px 20px rgba(39,110,241,0.5)',
      cursor: 'pointer',
    }}
  >
    <Plus size={18} />
    Ask a question
  </button>
);
