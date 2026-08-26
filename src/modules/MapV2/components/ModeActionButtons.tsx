import React from 'react';
import { CheckCircle2, Ghost, MessageCircleQuestion, Plus } from 'lucide-react';
import { GAME_MODE, GameMode } from '../hooks/useGameMode';
import { GameButton } from './GameButton';

interface ModeActionButtonsProps {
  mode: GameMode;
  onAnswerQuestions: () => void;
  pendingAnswerCount: number;
  onAskQuestion: () => void;
  isCursed: boolean;
  onOpenCurseStatus: () => void;
}

/**
 * Bottom-center action row, mode-aware — only the buttons relevant to
 * whatever the player is currently doing. Hiding shows just "Answer" —
 * functional, useAnswerQuestionsFlow, with a live pending-count badge; it
 * sits in the *upper* row in Hiding mode (CardModule's Draw/Hand/Discard
 * take the bottom, thumb-closest row instead — see MapCanvas.tsx — since
 * cards are the more frequent action). Seeking shows "Accept" (a stub,
 * same as before), "Cursed", and "Ask" (functional, the draft-fact
 * wizard). "Cursed" always uses GameButton's danger (red) tone — it's a
 * threat, not an ordinary action, so it should never read as just another
 * blue button — and only *pulses* while this team actually has an active
 * curse (curse/useCurseModule.ts); tapping it opens the seeker's own
 * curse-status sheet either way. Seeking has no card row, so it stays in
 * the bottom position there.
 */
export const ModeActionButtons: React.FC<ModeActionButtonsProps> = ({
  mode, onAnswerQuestions, pendingAnswerCount, onAskQuestion, isCursed, onOpenCurseStatus,
}) => (
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
        <GameButton
          icon={<Ghost size={20} />}
          label="Cursed"
          ariaLabel={isCursed ? 'You are cursed — view challenge' : 'Curse status'}
          onClick={onOpenCurseStatus}
          tone="danger"
          pulse={isCursed}
        />
        <GameButton icon={<Plus size={20} />} label="Ask" ariaLabel="Ask a question" onClick={onAskQuestion} />
      </>
    )}
  </div>
);
