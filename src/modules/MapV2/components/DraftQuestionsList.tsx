import React from 'react';
import { X } from 'lucide-react';
import { AskedQuestionDto } from '../factsV2/factTypes';

interface DraftQuestionsListProps {
  questions: AskedQuestionDto[];
  onRemove: (questionId: string) => void;
}

/**
 * Pending drafts as a horizontally-scrollable chip row pinned above the
 * status banner/FAB — reachable without permanently claiming vertical map
 * space the way a stacked card list would on a short phone screen.
 */
export const DraftQuestionsList: React.FC<DraftQuestionsListProps> = ({ questions, onRemove }) => {
  if (questions.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 'calc(132px + env(safe-area-inset-bottom))',
        zIndex: 15,
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '0 12px',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {questions.map((q) => (
        <div
          key={q.question_id}
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '260px',
            padding: '8px 8px 8px 14px',
            borderRadius: '20px',
            backgroundColor: 'rgba(156,39,176,0.22)',
            border: '1px dashed rgba(186,104,200,0.6)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: '12px', color: '#e1bee7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {q.rendered_question}
          </span>
          <button
            onClick={() => onRemove(q.question_id)}
            aria-label="Remove draft question"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ce93d8', padding: 0, display: 'flex', flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
