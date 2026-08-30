import React from 'react';
import { CheckCircle2, EyeOff, Ghost, MessageCircleQuestion, Plus } from 'lucide-react';
import { GAME_MODE, GameMode } from '../hooks/useGameMode';
import { GameButton } from './GameButton';

interface ModeActionButtonsProps {
  mode: GameMode;
  onAnswerQuestions: () => void;
  pendingAnswerCount: number;
  onAskQuestion: () => void;
  onAcceptAnswers: () => void;
  pendingAcceptCount: number;
  onOpenHidingZone: () => void;
  hasSavedHidingZone: boolean;
  /** Whether the saved zone currently draws on the map — a separate
   * concern from having one saved at all (see HidingZoneSheet's own
   * show/hide toggle). Only meaningful when hasSavedHidingZone is true. */
  hidingZoneVisible: boolean;
  curseCount: number;
  onOpenCurseStatus: () => void;
}

/**
 * Bottom-center action row, mode-aware — only the buttons relevant to
 * whatever the player is currently doing. Hiding shows "Answer" (functional,
 * useAnswerQuestionsFlow, with a live pending-count badge) and "Zone"
 * (functional, useHidingZoneFlow — a private, local-only point+radius
 * reminder of where this hider is hiding, badged once one's saved); this
 * row sits in the *upper* position in Hiding mode (CardModule's Draw/Hand/
 * Discard take the bottom, thumb-closest row instead — see MapCanvas.tsx —
 * since cards are the more frequent action). Seeking shows "Accept" (functional,
 * useAcceptAnswersFlow, with a live pending-count badge), "Cursed", and
 * "Ask" (functional, the draft-fact wizard). "Cursed" always uses GameButton's danger (red) tone — it's a
 * threat, not an ordinary action, so it should never read as just another
 * blue button — and only *pulses* while this team actually has an active
 * curse (curse/useCurseModule.ts), with a badge showing how many; tapping
 * it opens the seeker's own curse-status sheet either way. Seeking has no
 * card row, so it stays in the bottom position there.
 */
export const ModeActionButtons: React.FC<ModeActionButtonsProps> = ({
  mode, onAnswerQuestions, pendingAnswerCount, onAskQuestion, onAcceptAnswers, pendingAcceptCount,
  onOpenHidingZone, hasSavedHidingZone, hidingZoneVisible, curseCount, onOpenCurseStatus,
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
      <>
        <GameButton
          icon={<MessageCircleQuestion size={20} />}
          label="Answer"
          ariaLabel="Answer questions"
          badge={pendingAnswerCount}
          onClick={onAnswerQuestions}
        />
        <GameButton
          icon={<EyeOff size={20} />}
          label="Zone"
          ariaLabel={hasSavedHidingZone ? 'My hiding zone (saved)' : 'Save my hiding zone'}
          badge={!hasSavedHidingZone ? 0 : hidingZoneVisible ? 'check' : 'hidden'}
          onClick={onOpenHidingZone}
        />
      </>
    ) : (
      <>
        <GameButton
          icon={<CheckCircle2 size={20} />}
          label="Accept"
          ariaLabel="Accept answers"
          badge={pendingAcceptCount}
          onClick={onAcceptAnswers}
        />
        <GameButton
          icon={<Ghost size={20} />}
          label="Cursed"
          ariaLabel={curseCount > 0 ? `You are cursed — ${curseCount} active challenge${curseCount === 1 ? '' : 's'}` : 'Curse status'}
          badge={curseCount}
          onClick={onOpenCurseStatus}
          tone="danger"
          pulse={curseCount > 0}
        />
        <GameButton icon={<Plus size={20} />} label="Ask" ariaLabel="Ask a question" onClick={onAskQuestion} />
      </>
    )}
  </div>
);
