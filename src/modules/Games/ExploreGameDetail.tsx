import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useFetchGameDetailsQuery,
  useFetchTeamsQuery,
  useJoinGameMutation,
  useJoinTeamMutation,
} from '../../apis/gameApi';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { getLabel } from '../../utils/utils';
import { getRoute } from '../../utils/getRoute';
import { GAME_DETAIL_ROUTE } from '../../constants/routes';
import LoadingScreen from '../../components/LoadingScreen';
import ErrorScreen from '../../components/ErrorScreen';
import { TeamAvatar } from '../../components/TeamAvatar';
import { Team } from '../../models/Team';
import { Player } from '../../models/Player';
import {
  Calendar,
  Globe,
  Lock,
  User,
  Users,
  Shield,
  Hash,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Eye,
  Share2,
} from 'lucide-react';

export default function ExploreGameDetail() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  const {
    data: game,
    isLoading: isGameLoading,
    isError: isGameError,
    refetch,
  } = useFetchGameDetailsQuery(gameId || '');

  const { data: teamsList } = useFetchTeamsQuery(gameId || '');

  const [joinGame, { isLoading: isJoiningGame }] = useJoinGameMutation();
  const [joinTeam, { isLoading: isJoiningTeam }] = useJoinTeamMutation();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isJoining = isJoiningGame || isJoiningTeam;

  // Use teams from game details if available, fallback to teamsList query
  const teams: Team[] = game?.teams || teamsList || [];

  // Calculate total players count
  const totalPlayersCount = teams.reduce(
    (acc, t) => acc + (t.players ? t.players.length : 0),
    0
  );

  const handleCopyCode = () => {
    if (game?.game_code) {
      navigator.clipboard.writeText(game.game_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShareLink = async () => {
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
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoin = async (targetTeamId?: string) => {
    if (!gameId) return;
    setErrorMessage(null);

    try {
      if (targetTeamId) {
        await joinTeam({ gameId, teamId: targetTeamId }).unwrap();
      } else {
        await joinGame(gameId).unwrap();
      }
      // Successfully joined -> navigate to Active Game Detail page
      navigate(getRoute(GAME_DETAIL_ROUTE, { gameId }));
    } catch (err: any) {
      console.error('Failed to join game:', err);
      const msg =
        err?.data?.message ||
        err?.data?.detail ||
        'Failed to join game. Please try again.';
      setErrorMessage(msg);
    }
  };

  if (isGameLoading) {
    return <LoadingScreen />;
  }

  if (isGameError || !game) {
    return (
      <ErrorScreen
        title="Game Details Unavailable"
        description="Could not fetch details for this discoverable game."
        action={refetch}
      />
    );
  }

  const getVisibilityBadge = (mode?: string) => {
    const isPublic = mode?.toUpperCase() === 'PUBLIC';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase ${
          isPublic
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        {isPublic ? (
          <Globe className="w-3 h-3 text-emerald-600" />
        ) : (
          <Lock className="w-3 h-3 text-amber-600" />
        )}
        {getLabel(mode || 'PUBLIC')} Mode
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
  };

  const isPendingGame = game?.game_status?.toUpperCase() === 'PENDING';

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28 sm:pb-24 text-left">
      <Header
        title={game.name}
        onBack={() => navigate(-1)}
        action={
          <div className="flex items-center gap-2">
            {isPendingGame && game.game_code && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareLink}
                className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 py-1 px-2.5 sm:px-3 h-9 sm:h-10 rounded-xl flex items-center gap-1.5"
                title="Share Game Join Link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Share Link</span>
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => handleJoin(selectedTeamId || undefined)}
              disabled={isJoining || !isPendingGame}
              className={`hidden sm:flex font-bold px-5 py-2 rounded-xl shadow-md transition-all items-center gap-2 h-10 ${
                !isPendingGame
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-200'
              }`}
              title={!isPendingGame ? `Game is ${getLabel(game.game_status)} - Joining disabled` : undefined}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : !isPendingGame ? (
                <span>Joining Disabled</span>
              ) : selectedTeamId ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Join Team
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Join as Spectator
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{errorMessage}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:bg-rose-100 font-bold text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Top Banner Card: Hero Overview */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 sm:p-8 relative">
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {getVisibilityBadge(game.game_visibility_mode)}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase ${getStatusBadge(
                    game.game_status
                  )}`}
                >
                  {getLabel(game.game_status)}
                </span>
                <span className="bg-white/10 backdrop-blur-md text-white/90 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 border border-white/20">
                  <Hash className="w-3 h-3 text-indigo-300" />
                  {game.game_code}
                  <button
                    onClick={handleCopyCode}
                    className="ml-1 text-white/70 hover:text-white transition-colors"
                    title="Copy Game Code"
                  >
                    {copiedCode ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </span>
              </div>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight mb-2 text-left leading-tight">
              {game.name}
            </h1>

            <p className="text-indigo-100 text-xs sm:text-base leading-relaxed max-w-3xl text-left">
              {game.description || 'No description provided for this game.'}
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-left">
              <div>
                <span className="text-[11px] text-indigo-200 font-medium block">
                  Game Type
                </span>
                <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  {getLabel(game.game_type)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-indigo-200 font-medium block">
                  Total Teams
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {teams.length} Teams
                </span>
              </div>
              <div>
                <span className="text-[11px] text-indigo-200 font-medium block">
                  Total Players
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {totalPlayersCount} Players
                </span>
              </div>
              <div>
                <span className="text-[11px] text-indigo-200 font-medium block">
                  Created
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {new Date(game.created).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 bg-white">
            {/* Host Details Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left">
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-sm shrink-0">
                  {game.game_master.profile_name
                    ? game.game_master.profile_name.charAt(0).toUpperCase()
                    : '?'}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-left">
                    <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase text-indigo-600 tracking-wider text-left">
                      Game Master / Host
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 text-left truncate">
                    {game.game_master.profile_name}
                  </h3>
                  {game.game_master.email_id && (
                    <p className="text-[11px] sm:text-xs text-gray-500 text-left truncate">
                      {game.game_master.email_id}
                    </p>
                  )}
                </div>
              </div>

              {game.game_master.phone && (
                <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-200 self-start sm:self-center">
                  <span className="font-semibold text-gray-700">Contact:</span>{' '}
                  {game.game_master.phone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Players & Teams View */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                Teams & Players
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Tap a team to select and join as an active player.
              </p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-200 shrink-0">
              {totalPlayersCount} Players
            </span>
          </div>

          {teams.length === 0 ? (
            <Card className="border-gray-200 bg-white p-6 sm:p-8 text-center rounded-2xl border-dashed">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-700 font-bold text-sm">
                No teams created yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                You can join the game directly as a spectator or wait for teams to be set up.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teams.map((team: Team) => {
                const isSelected = selectedTeamId === team.team_id;
                const playersList: Player[] = team.players || [];

                return (
                  <Card
                    key={team.team_id}
                    onClick={() => {
                      if (isPendingGame) {
                        setSelectedTeamId(isSelected ? null : team.team_id);
                      }
                    }}
                    className={`border transition-all duration-200 rounded-2xl bg-white overflow-hidden text-left cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-md'
                        : 'border-gray-200 hover:border-indigo-200 shadow-sm'
                    }`}
                  >
                    {/* Team Header */}
                    <div className="p-3.5 sm:p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <TeamAvatar
                          teamName={team.team_name}
                          teamColor={team.team_colour}
                          className="w-8 h-8 font-bold shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                            {team.team_name}
                          </h3>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                            {playersList.length} Players
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        disabled={!isPendingGame}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPendingGame) {
                            setSelectedTeamId(isSelected ? null : team.team_id);
                          }
                        }}
                        className={`text-xs font-bold px-3 py-1.5 h-8 rounded-xl shrink-0 ${
                          !isPendingGame
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select Team'}
                      </Button>
                    </div>

                    {/* Players List */}
                    <CardContent className="p-3 sm:p-4 space-y-2.5">
                      {playersList.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                          <User className="w-7 h-7 mx-auto mb-1 opacity-40" />
                          <p className="text-xs">No players in this team yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {playersList.map((player: Player, idx: number) => {
                            const initial = player.profile_name
                              ? player.profile_name.charAt(0).toUpperCase()
                              : 'P';
                            const email = player.user_profile?.email;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-gray-50/60 hover:bg-gray-100/80 border border-gray-100 transition-colors text-left gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
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

                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  {player.is_suspended ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                      Suspended
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      Active
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Bottom Join CTA Card */}
        <Card className="hidden sm:block border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 rounded-2xl shadow-sm border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 justify-center sm:justify-start">
                {!isPendingGame ? (
                  <Lock className="w-4 h-4 text-amber-600" />
                ) : selectedTeamId ? (
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Eye className="w-4 h-4 text-indigo-600" />
                )}
                {!isPendingGame
                  ? `Game ${getLabel(game.game_status)}`
                  : selectedTeamId
                  ? 'Ready to participate?'
                  : 'Join as Spectator'}
              </h3>
              <p className="text-xs text-gray-600">
                {!isPendingGame
                  ? `This game is currently ${getLabel(game.game_status)}. New players cannot join.`
                  : selectedTeamId
                  ? 'You have selected a team to join as an active player.'
                  : 'No team selected. You will join the game session as a Spectator.'}
              </p>
            </div>

            <Button
              onClick={() => handleJoin(selectedTeamId || undefined)}
              disabled={isJoining || !isPendingGame}
              className={`w-full sm:w-auto font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                !isPendingGame
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
              }`}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : !isPendingGame ? (
                <span>Joining Disabled</span>
              ) : (
                <>
                  <span>
                    {selectedTeamId ? 'Join Selected Team' : 'Join as Spectator'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Sticky Mobile Bottom CTA Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 px-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 shadow-lg flex items-center gap-2 text-left">
        {isPendingGame && game.game_code && (
          <Button
            variant="outline"
            onClick={handleShareLink}
            className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-11 px-3.5 rounded-2xl shrink-0 flex items-center justify-center"
            title="Share Game Join Link"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4 text-indigo-600" />
            )}
          </Button>
        )}

        <Button
          onClick={() => handleJoin(selectedTeamId || undefined)}
          disabled={isJoining || !isPendingGame}
          className={`flex-1 font-extrabold text-xs sm:text-sm h-11 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
            !isPendingGame
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
          }`}
        >
          {isJoining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Joining...</span>
            </>
          ) : !isPendingGame ? (
            <span>Joining Disabled</span>
          ) : selectedTeamId ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Join Selected Team</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Join as Spectator</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
