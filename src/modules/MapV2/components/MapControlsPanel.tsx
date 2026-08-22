import React from 'react';
import { AskedQuestionDto } from '../factsV2/factTypes';
import { TeamFilterResult } from '../hooks/useTeamFilter';
import { uberDark } from '../theme';
import { LayerControlPanel } from './LayerControlPanel';
import { TeamFilterDropdown } from './TeamFilterDropdown';
import { DraftQuestionsList } from './DraftQuestionsList';

interface MapControlsPanelProps {
  teamFilter: TeamFilterResult;
  onOpenWizard: () => void;
  previewEnabled: boolean;
  onTogglePreview: () => void;
  draftQuestions: AskedQuestionDto[];
  onRemoveDraftQuestion: (questionId: string) => void;
}

const pillButtonStyle = (background: string, border: string): React.CSSProperties => ({
  alignSelf: 'flex-start',
  padding: '10px 16px',
  borderRadius: '24px',
  border: `1px solid ${border}`,
  backgroundColor: background,
  color: uberDark.textPrimary,
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
});

/**
 * The whole top-left floating control stack: team filter, layer visibility
 * tree, the two map-wide action toggles, and the pending-drafts list. One
 * component so MapCanvas's JSX doesn't have to interleave five unrelated
 * pieces of UI with its actual map-lifecycle logic.
 */
export const MapControlsPanel: React.FC<MapControlsPanelProps> = ({
  teamFilter,
  onOpenWizard,
  previewEnabled,
  onTogglePreview,
  draftQuestions,
  onRemoveDraftQuestion,
}) => (
  <div style={{ position: 'absolute', top: '68px', left: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <TeamFilterDropdown
      playerTeams={teamFilter.playerTeams}
      selectedTeamId={teamFilter.selectedTeamId}
      onChange={teamFilter.setSelectedTeamId}
      isLoading={teamFilter.isLoading}
    />
    <LayerControlPanel />
    <button onClick={onOpenWizard} style={pillButtonStyle(uberDark.accent, uberDark.accent)}>
      + Ask a question
    </button>
    <button
      onClick={onTogglePreview}
      style={pillButtonStyle(previewEnabled ? uberDark.success : uberDark.surfaceElevated, previewEnabled ? uberDark.success : uberDark.border)}
    >
      {previewEnabled ? 'Preview: on (hover map)' : 'Preview: off'}
    </button>
    <DraftQuestionsList questions={draftQuestions} onRemove={onRemoveDraftQuestion} />
  </div>
);
