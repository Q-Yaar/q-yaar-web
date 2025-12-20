import { Shield } from "lucide-react";
import { Team } from "../../models/Team"; // Assuming you created this earlier

interface TeamSectionProps {
  team?: Team;
  isLoading: boolean;
  error?: any;
}

export function TeamSection({ team, isLoading, error }: TeamSectionProps) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Shield className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 text-left">My Team</h3>
          {team && <p className="text-sm text-gray-500">Squad Information</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg">
          Unable to load team details.
        </div>
      ) : team ? (
        <div>
          {/* Team Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div>
              <span className="text-sm text-gray-500 block">Team Name</span>
              <span className="font-semibold text-gray-900 text-lg text-left">
                {team.team_name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500 block">Color</span>
              <span className="font-medium px-2 py-1 rounded bg-gray-100 text-gray-800 text-sm">
                {team.team_colour}
              </span>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            Players ({team.players.length})
          </h4>

          {/* Player Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.players.map((player) => (
              <div
                key={player.user_profile.user_id}
                className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                  {player.profile_name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-900 truncate text-left">
                    {player.profile_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {player.user_profile.email}
                  </p>
                </div>
                {player.is_suspended && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded ml-auto">
                    Suspended
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 italic">No team data found.</p>
      )}
    </section>
  );
}