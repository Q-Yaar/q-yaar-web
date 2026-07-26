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
  Shield,
  Sparkles,
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
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [joinTeam, { isLoading: isJoiningTeam }] = useJoinTeamMutation();
  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const canSwitchTeam = gameStatus?.toUpperCase() === 'PENDING';

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
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
      const msg =
        err?.data?.message || err?.data?.detail || 'Failed to switch team.';
      setSwitchError(msg);
    } finally {
      setSwitchingTeamId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch / Join Team"
      className="max-w-lg w-full rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 pb-6 text-left"
    >
      {/* Mobile Drag Indicator Bar */}
      <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />

      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-0.5">
        {/* Error Alert */}
        {switchError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between font-medium animate-fade-in">
            <span>{switchError}</span>
            <button
              onClick={() => setSwitchError(null)}
              className="text-rose-500 hover:text-rose-800 font-bold ml-2 p-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sub-header Context Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{teams.length} Teams Registered</span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600/80">
            {canSwitchTeam
              ? 'Tap a team to switch instantly'
              : 'Team lock in effect (Game active)'}
          </span>
        </div>

        {/* Teams Mobile-First List */}
        <div className="space-y-3">
          {teams.length === 0 ? (
            <div className="text-gray-500 text-center py-10 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              No teams available in this game yet.
            </div>
          ) : (
            teams.map((team) => {
              const isExpanded = !!expandedTeams[team.team_id];
              const playersList = team.players || [];
              const isCurrentTeam = team.team_id === currentTeam?.team_id;
              const isTargetSwitching = switchingTeamId === team.team_id;

              return (
                <div
                  key={team.team_id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden text-left ${
                    isCurrentTeam
                      ? 'border-indigo-400 ring-2 ring-indigo-500/15 bg-indigo-50/40 shadow-xs'
                      : isExpanded
                      ? 'border-gray-300 shadow-sm bg-white'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {/* Card Header Container */}
                  <div
                    className="p-3.5 sm:p-4 cursor-pointer select-none"
                    onClick={() => toggleTeam(team.team_id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <TeamAvatar
                          teamName={team.team_name}
                          teamColor={team.team_colour}
                          className="w-10 h-10 text-xs font-bold shrink-0 shadow-xs ring-1 ring-gray-100"
                        />

                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-sm sm:text-base font-bold truncate ${
                              isCurrentTeam ? 'text-indigo-900' : 'text-gray-900'
                            }`}>
                              {team.team_name}
                            </h4>
                            {isCurrentTeam && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200 shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                YOUR TEAM
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span className="font-medium">{playersList.length} Players</span>
                            <span>•</span>
                            <span className="capitalize">{team.team_colour}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-gray-400 p-1">
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-gray-700' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Switch Button: Mobile Touch Target (Full width on mobile, inline on desktop) */}
                    {gameId && canSwitchTeam && !isCurrentTeam && (
                      <div className="mt-3 sm:mt-2 pt-2 border-t border-gray-100/80 sm:border-0 sm:pt-0 flex justify-end">
                        <Button
                          size="sm"
                          disabled={isJoiningTeam}
                          onClick={(e) => handleSwitchTeam(team.team_id, e)}
                          className="w-full sm:w-auto h-10 sm:h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                          {isTargetSwitching ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Switching...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Switch to {team.team_name}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Players List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/70 p-3 space-y-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block text-left px-1">
                        Team Roster ({playersList.length})
                      </span>
                      {playersList.length > 0 ? (
                        <div className="space-y-1.5">
                          {playersList.map((player, pIdx) => {
                            const initial = player.profile_name
                              ? player.profile_name.charAt(0).toUpperCase()
                              : 'P';
                            const email = player.user_profile?.email;

                            return (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs text-left"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                    {initial}
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="text-xs font-bold text-gray-800 truncate text-left">
                                      {player.profile_name || 'Anonymous Player'}
                                    </p>
                                    {email && (
                                      <p className="text-[11px] text-gray-400 truncate text-left">
                                        {email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {player.is_suspended && (
                                  <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 shrink-0">
                                    Suspended
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-400 italic bg-white rounded-xl border border-gray-100">
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
