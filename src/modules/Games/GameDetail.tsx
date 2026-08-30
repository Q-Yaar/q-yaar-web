import { useNavigate, useParams } from 'react-router-dom';
import { MAP_ROUTE } from '../../constants/routes';
import { useFetchMyTeamQuery, useFetchGameDetailsQuery } from '../../apis/gameApi';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { LocationCard } from './LocationCard';
import { MyTeamCard } from './MyTeamCard';
import { QuestionsCard } from './QuestionsCard';
import { DecksCard } from './DecksCard';
import { TeamModal } from './TeamModal';
import { useState } from 'react';
import { TeamAvatar } from 'components/TeamAvatar';
import { isPlayerTeam } from '../../models/Team';
import { getRoute } from '../../utils/getRoute';
import { RefreshCw, Share2, Check, Hash, MapPinned } from 'lucide-react';

export default function GameDetail() {
  const navigate = useNavigate();
  const { gameId } = useParams();

  // Fetch Team & Game Details (game details includes teams array, avoiding extra API call)
  const {
    data: team,
    isLoading: isTeamLoading,
    error: teamError,
  } = useFetchMyTeamQuery(gameId!);

  const { data: game, isLoading: isGameLoading } = useFetchGameDetailsQuery(gameId!);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const teams = game?.teams || [];
  // A spectator has no team (or a non-player one) — the team roster and
  // deck cards have nothing to show them, so both are skipped entirely
  // rather than rendering an empty/misleading state.
  const isSpectator = !isTeamLoading && (!team || !isPlayerTeam(team));

  const onBack = () => navigate(-1);

  const handleShareGame = async () => {
    if (!game?.game_code) return;
    const shareableUrl = `${window.location.origin}/join/${game.game_code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${game.name}`,
          text: `Join my Q-Yaar game "${game.name}" with code ${game.game_code}!`,
          url: shareableUrl,
        });
        return;
      } catch (e) {
        // Fallback to copy
      }
    }
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isPendingGame = game?.game_status?.toUpperCase() === 'PENDING';

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header
        title={game?.name || 'Game Modules'}
        onBack={onBack}
        action={
          <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 pl-3 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <TeamAvatar
                teamName={team?.team_name || 'Spectator'}
                teamColor={team?.team_colour || 'gray'}
                className="w-5 h-5 font-bold shadow-xs"
              />
              <span className="text-xs font-bold text-gray-800 max-w-[120px] truncate hidden sm:inline">
                {team?.team_name || 'Spectator'}
              </span>
            </div>
            {isPendingGame ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 py-1 px-2.5 h-7 flex items-center gap-1.5 rounded-xl transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Switch Team</span>
              </Button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-semibold text-gray-500 hover:text-indigo-600 px-2 py-1 transition-colors"
                title="View Teams & Players"
              >
                View Teams
              </button>
            )}
          </div>
        }
      />

      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teams={teams}
        currentTeam={team || null}
        gameId={gameId}
        gameStatus={game?.game_status}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Share Game Banner */}
        {isPendingGame && game?.game_code && (
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-indigo-200 border border-white/10 uppercase tracking-wider">
                  Invite Players
                </span>
                <span className="text-xs text-indigo-200/80 font-mono flex items-center gap-1">
                  <Hash className="w-3 h-3 text-indigo-300" />
                  {game.game_code}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Share this game link to let players join your game instantly!
              </p>
            </div>

            <Button
              onClick={handleShareGame}
              className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs px-4 py-2.5 h-10 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all shrink-0"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-indigo-700" />
                  <span>Share Game Link</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Location card component */}
        <LocationCard gameId={gameId!} />

        {!isSpectator && (
          <MyTeamCard
            team={team || null}
            isLoading={isTeamLoading}
            isPendingGame={isPendingGame}
            onChangeTeam={() => setIsModalOpen(true)}
          />
        )}

        <QuestionsCard gameId={gameId!} />

        {!isSpectator && team && <DecksCard gameId={gameId!} team={team} />}
      </div>

      {/* Floating "Enter game" CTA — the map is the whole point of the
          game now that Deck/Dice/Ask/Answer/Facts have their own entry
          points removed from this grid, so it gets a permanent, always
          reachable button instead of competing with other tiles. */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 shadow-lg flex justify-center">
        <Button
          onClick={() => navigate(getRoute(MAP_ROUTE, { gameId }))}
          className="w-full max-w-md h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
        >
          <MapPinned className="w-4 h-4" />
          Enter Game
        </Button>
      </div>
    </div>
  );
}
