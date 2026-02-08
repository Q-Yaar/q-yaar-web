import React, { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Team } from '../../models/Team';
import { Users, User, Shield, X } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');

  // Filter out current team from all teams list to avoid duplication if needed,
  // or just show all.
  // The requirement says "shows all teams and my team players".

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Details"
      className="max-w-2xl"
    >
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`flex-1 pb-2 text-sm font-medium transition-colors ${
            activeTab === 'teams'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('teams')}
        >
          All Teams
        </button>
        <button
          className={`flex-1 pb-2 text-sm font-medium transition-colors ${
            activeTab === 'players'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('players')}
        >
          My Team Players
        </button>
      </div>

      <div className="mt-4 max-h-[60vh] overflow-y-auto">
        {activeTab === 'teams' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {teams.length === 0 ? (
              <p className="text-gray-500 col-span-2 text-center py-4">
                No teams found.
              </p>
            ) : (
              teams.map((team) => (
                <div
                  key={team.team_id}
                  className={`p-3 rounded-lg border flex items-center gap-3 ${
                    team.team_id === currentTeam?.team_id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <TeamAvatar
                    teamName={team.team_name}
                    teamColor={team.team_colour}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {team.team_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {team.players?.length || 0} Players
                    </p>
                  </div>
                  {team.team_id === currentTeam?.team_id && (
                    <Shield className="w-4 h-4 text-indigo-500" />
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!currentTeam ? (
              <p className="text-gray-500 text-center py-4">
                You are not in a team.
              </p>
            ) : !currentTeam.players || currentTeam.players.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No players in this team.
              </p>
            ) : (
              currentTeam.players.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {player.profile_name || 'Unknown Player'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {/* Role not available in Player model yet */}
                      Member
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
