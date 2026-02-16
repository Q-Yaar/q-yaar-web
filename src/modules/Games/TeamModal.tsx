
import React, { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Team } from '../../models/Team';
import {
  Users,
  User,
  ChevronDown
} from 'lucide-react';
import { TeamAvatar } from '../../components/TeamAvatar';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  currentTeam: Team | null;
}

export function TeamModal({
  isOpen,
  onClose,
  teams,
  currentTeam,
}: TeamModalProps) {
  // Track expanded state instead of collapsed. Default to empty (all collapsed)
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Teams"
      className="max-w-xl"
    >
      <div className="bg-white p-4 sm:p-6 max-h-[85vh] overflow-y-auto">

        {/* Header Stats */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600">
            <Users className="w-3.5 h-3.5" />
            <span>{teams.length} Teams</span>
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-3">
          {teams.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-sm bg-gray-50 rounded-lg dashed border border-gray-200">
              No teams have joined yet.
            </div>
          ) : (
            teams.map((team) => {
              const isExpanded = !!expandedTeams[team.team_id];
              const hasPlayers = team.players && team.players.length > 0;
              const isCurrentTeam = team.team_id === currentTeam?.team_id;

              return (
                <div
                  key={team.team_id}
                  className={`rounded-lg border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-gray-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer select-none bg-white"
                    onClick={() => toggleTeam(team.team_id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamAvatar
                        teamName={team.team_name}
                        teamColor={team.team_colour}
                        className="w-8 h-8 text-[10px] shrink-0 shadow-sm ring-1 ring-gray-100"
                      />

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${isCurrentTeam ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {team.team_name}
                          </span>
                          {isCurrentTeam && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-100 shrink-0">YOU</span>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          {team.players?.length || 0} players
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-400 pl-2">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Players List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      {hasPlayers ? (
                        <div className="p-2 space-y-1">
                          {team.players.map((player, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-3 p-2 rounded-md hover:bg-black/5 transition-colors">
                              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shrink-0 border border-gray-200 text-gray-400 shadow-sm">
                                <User className="w-3 h-3" />
                              </div>
                              <span className="text-sm text-gray-700 font-medium truncate">
                                {player.profile_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-400 italic">
                          No players in this team
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
