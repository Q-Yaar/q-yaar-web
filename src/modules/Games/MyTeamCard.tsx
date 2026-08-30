import { Lock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from '../../components/ui/button';
import { TeamAvatar } from 'components/TeamAvatar';
import { Team } from '../../models/Team';

interface MyTeamCardProps {
  team: Team | null;
  isLoading: boolean;
  /** Only PENDING games allow switching teams — see TeamModal.tsx's own
   * identical gate (gameStatus?.toUpperCase() === 'PENDING'). */
  isPendingGame: boolean;
  onChangeTeam: () => void;
}

/**
 * The player's full current team, roster and all — a fuller companion to
 * the compact team pill already in the Header's action slot, not a
 * replacement for it. "Change" reuses the same TeamModal the header's own
 * switcher opens (see GameDetail.tsx), just triggered from here too.
 */
export function MyTeamCard({ team, isLoading, isPendingGame, onChangeTeam }: MyTeamCardProps) {
  const players = team?.players || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamAvatar
            teamName={team?.team_name || 'Spectator'}
            teamColor={team?.team_colour || 'gray'}
            className="w-9 h-9 font-bold shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{team?.team_name || 'No Team'}</CardTitle>
            <p className="text-xs text-gray-500">{players.length} player{players.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {isPendingGame ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onChangeTeam}
            className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8 px-3 rounded-xl flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Change
          </Button>
        ) : (
          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3" /> Locked
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
        ) : players.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No players on this team yet.</p>
        ) : (
          players.map((player, idx) => {
            const initial = player.profile_name ? player.profile_name.charAt(0).toUpperCase() : 'P';
            const email = player.user_profile?.email;
            return (
              <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-800 truncate">{player.profile_name || 'Anonymous Player'}</p>
                  {email && <p className="text-[11px] text-gray-400 truncate">{email}</p>}
                </div>
                {player.is_suspended && (
                  <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 shrink-0">
                    Suspended
                  </span>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
