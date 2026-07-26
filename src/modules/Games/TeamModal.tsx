
import React, { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { Team } from '../../models/Team';
import {
  Users,
  User,
  ChevronDown,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { TeamAvatar } from '../../components/TeamAvatar';
import { useJoinTeamMutation } from '../../apis/gameApi';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  currentTeam: Team | null;
  gameId?: string;
  gameStatus?: string;
}

export function TeamModal({
  isOpen,
  onClose,
  teams,
  currentTeam,
  gameId,
  gameStatus,
}: TeamModalProps) {
  // Track expanded state instead of collapsed. Default to empty (all collapsed)
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [joinTeam, { isLoading: isJoiningTeam }] = useJoinTeamMutation();
  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const canSwitchTeam = gameStatus?.toUpperCase() === 'PENDING';

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const handleSwitchTeam = async (targetTeamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!gameId || !canSwitchTeam) return;
    setSwitchError(null);
    setSwitchingTeamId(targetTeamId);

    try {
      await joinTeam({ gameId, teamId: targetTeamId }).unwrap();
      onClose();
    } catch (err: any) {
      console.error('Failed to switch team:', err);
      const msg = err?.data?.message || err?.data?.detail || 'Failed to switch team.';
      setSwitchError(msg);
    } finally {
      setSwitchingTeamId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Game Teams & Players"
      className="max-w-xl"
    >
      <div className="bg-white p-4 sm:p-6 max-h-[85vh] overflow-y-auto space-y-4">
        {/* Error Alert */}
        {switchError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between font-medium">
            <span>{switchError}</span>
            <button
              onClick={() => setSwitchError(null)}
              className="text-rose-500 hover:text-rose-800 font-bold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 text-xs font-bold text-indigo-700">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>{teams.length} Teams Available</span>
          </div>
          <span className="text-xs text-gray-500">
            {canSwitchTeam ? 'Select a team below to switch' : 'Team membership locked (Game active)'}
          </span>
        </div>

        {/* Teams List */}
        <div className="space-y-3">
          {teams.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No teams available in this game yet.
            </div>
          ) : (
            teams.map((team) => {
              const isExpanded = !!expandedTeams[team.team_id];
              const hasPlayers = team.players && team.players.length > 0;
              const isCurrentTeam = team.team_id === currentTeam?.team_id;
              const isTargetSwitching = switchingTeamId === team.team_id;

              return (
                <div
                  key={team.team_id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isCurrentTeam
                      ? 'border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm bg-indigo-50/30'
                      : isExpanded
                      ? 'border-gray-300 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="flex items-center justify-between p-3.5 cursor-pointer select-none bg-white"
                    onClick={() => toggleTeam(team.team_id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <TeamAvatar
                        teamName={team.team_name}
                        teamColor={team.team_colour}
                        className="w-9 h-9 text-xs font-bold shrink-0 shadow-sm ring-1 ring-gray-100"
                      />

                      <div className="flex flex-col min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold truncate ${isCurrentTeam ? 'text-indigo-700' : 'text-gray-900'}`}>
                            {team.team_name}
                          </span>
                          {isCurrentTeam && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              CURRENT TEAM
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs font-medium">
                          {team.players?.length || 0} players
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {gameId && canSwitchTeam && !isCurrentTeam && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isJoiningTeam}
                          onClick={(e) => handleSwitchTeam(team.team_id, e)}
                          className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 py-1 px-3 h-8 flex items-center gap-1.5 rounded-lg transition-all"
                        >
                          {isTargetSwitching ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Switching...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              Switch to Team
                            </>
                          )}
                        </Button>
                      )}

                      <div className="text-gray-400 p-1 hover:text-gray-600">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Players List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/80">
                      {hasPlayers ? (
                        <div className="p-3 space-y-1.5">
                          {team.players.map((player, pIdx) => (
                            <div key={pIdx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 shadow-2xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {player.profile_name ? player.profile_name.charAt(0).toUpperCase() : 'P'}
                                </div>
                                <span className="text-xs text-gray-800 font-bold truncate">
                                  {player.profile_name}
                                </span>
                              </div>
                              {player.is_suspended && (
                                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Suspended
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-400 italic">
                          No players in this team yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
