import React from 'react';
import { X } from 'lucide-react';
import { AskedQuestionDto } from '../factsV2/factTypes';
import { uberDark } from '../theme';

interface DraftQuestionsListProps {
  questions: AskedQuestionDto[];
  onRemove: (questionId: string) => void;
}

/**
 * The pending drafts a player has asked in this session — plain-language
 * text, with a way to retract one before it's ever sent to the hider.
 */
export const DraftQuestionsList: React.FC<DraftQuestionsListProps> = ({ questions, onRemove }) => {
  if (questions.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: uberDark.surfaceElevated,
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        border: `1px solid ${uberDark.border}`,
        padding: '8px',
        width: '280px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 600, color: uberDark.textSecondary, padding: '4px 4px 8px' }}>
        Your draft questions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {questions.map((q) => (
          <div
            key={q.question_id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '6px 8px', borderRadius: '8px', backgroundColor: 'rgba(156,39,176,0.12)',
              border: '1px dashed rgba(186,104,200,0.6)',
            }}
          >
            <span style={{ flex: 1, fontSize: '12px', color: '#e1bee7' }}>{q.rendered_question}</span>
            <button
              onClick={() => onRemove(q.question_id)}
              aria-label="Remove draft question"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ce93d8', padding: 0, display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
