import React from 'react';
import { CheckCircle2, MessageCircleQuestion, Plus } from 'lucide-react';
import { GAME_MODE, GameMode } from '../hooks/useGameMode';
import { GameButton } from './GameButton';

interface ModeActionButtonsProps {
  mode: GameMode;
  onAnswerQuestions: () => void;
  pendingAnswerCount: number;
  onAskQuestion: () => void;
}

/**
 * Bottom-center action row, mode-aware — only the buttons relevant to
 * whatever the player is currently doing. Hiding shows just "Answer" —
 * functional, useAnswerQuestionsFlow, with a live pending-count badge; it
 * sits in the *upper* row in Hiding mode (CardModule's Draw/Hand/Discard
 * take the bottom, thumb-closest row instead — see MapCanvas.tsx — since
 * cards are the more frequent action). Seeking shows "Ask" — functional,
 * the draft-fact wizard — next to an "Accept" stub, deliberately
 * visible-but-disabled rather than hidden so the mode still reads as "two
 * actions available here" even before it's wired up; Seeking has no card
 * row, so it stays in the bottom position there.
 */
export const ModeActionButtons: React.FC<ModeActionButtonsProps> = ({ mode, onAnswerQuestions, pendingAnswerCount, onAskQuestion }) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: mode === GAME_MODE.HIDING ? 'calc(104px + env(safe-area-inset-bottom))' : 'calc(18px + env(safe-area-inset-bottom))',
      zIndex: 20,
      display: 'flex',
      gap: '14px',
    }}
  >
    {mode === GAME_MODE.HIDING ? (
      <GameButton
        icon={<MessageCircleQuestion size={20} />}
        label="Answer"
        ariaLabel="Answer questions"
        badge={pendingAnswerCount}
        onClick={onAnswerQuestions}
      />
    ) : (
      <>
        <GameButton icon={<CheckCircle2 size={20} />} label="Accept" ariaLabel="Accept answers (coming soon)" disabled />
        <GameButton icon={<Plus size={20} />} label="Ask" ariaLabel="Ask a question" onClick={onAskQuestion} />
      </>
    )}
  </div>
);
