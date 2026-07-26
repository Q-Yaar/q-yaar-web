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
  Clock,
  Globe,
  Lock,
  User,
  Users,
  Shield,
  Hash,
  ArrowRight,
  CheckCircle2,
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
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${
          isPublic
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        {isPublic ? (
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Lock className="w-3.5 h-3.5 text-amber-600" />
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
    <div className="min-h-screen bg-gray-50/50 pb-24 text-left">
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
                className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 py-1 px-3 h-10 rounded-xl flex items-center gap-1.5"
                title="Share Game Join Link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
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
              disabled={isJoining}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl shadow-md hover:shadow-indigo-200 transition-all flex items-center gap-2 h-10"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:bg-rose-100"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Top Banner Card: Hero Overview */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 relative">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getVisibilityBadge(game.game_visibility_mode)}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${getStatusBadge(
                    game.game_status
                  )}`}
                >
                  {getLabel(game.game_status)}
                </span>
                <span className="bg-white/10 backdrop-blur-md text-white/90 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border border-white/20">
                  <Hash className="w-3.5 h-3.5 text-indigo-300" />
                  {game.game_code}
                  <button
                    onClick={handleCopyCode}
                    className="ml-1 text-white/70 hover:text-white transition-colors"
                    title="Copy Game Code"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-left">
              {game.name}
            </h1>

            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed max-w-3xl text-left">
              {game.description || 'No description provided for this game.'}
            </p>

            {/* Quick Stats Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 text-left">
              <div>
                <span className="text-xs text-indigo-200 font-medium block">
                  Game Type
                </span>
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  {getLabel(game.game_type)}
                </span>
              </div>
              <div>
                <span className="text-xs text-indigo-200 font-medium block">
                  Total Teams
                </span>
                <span className="text-sm font-bold text-white">
                  {teams.length} Teams
                </span>
              </div>
              <div>
                <span className="text-xs text-indigo-200 font-medium block">
                  Total Players
                </span>
                <span className="text-sm font-bold text-white">
                  {totalPlayersCount} Players
                </span>
              </div>
              <div>
                <span className="text-xs text-indigo-200 font-medium block">
                  Created
                </span>
                <span className="text-sm font-bold text-white">
                  {new Date(game.created).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6 bg-white space-y-6">
            {/* Host Details Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left">
              <div className="flex items-center gap-3 text-left">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
                  {game.game_master.profile_name
                    ? game.game_master.profile_name.charAt(0).toUpperCase()
                    : '?'}
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5 text-left">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold uppercase text-indigo-600 tracking-wider text-left">
                      Game Master / Host
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 text-left truncate">
                    {game.game_master.profile_name}
                  </h3>
                  {game.game_master.email_id && (
                    <p className="text-xs text-gray-500 text-left truncate">
                      {game.game_master.email_id}
                    </p>
                  )}
                </div>
              </div>

              {game.game_master.phone && (
                <div className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 self-start sm:self-center">
                  <span className="font-semibold text-gray-700">Contact:</span>{' '}
                  {game.game_master.phone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Players & Teams View */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Teams & Players
              </h2>
              <p className="text-sm text-gray-500">
                Explore registered teams and active participants in this game.
              </p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">
              {totalPlayersCount} Players Joined
            </span>
          </div>

          {teams.length === 0 ? (
            <Card className="border-gray-200 bg-white p-8 text-center rounded-2xl border-dashed">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">
                No teams created yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                You can join the game directly to be assigned to a team.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {teams.map((team: Team) => {
                const isSelected = selectedTeamId === team.team_id;
                const playersList: Player[] = team.players || [];

                return (
                  <Card
                    key={team.team_id}
                    className={`border transition-all duration-200 rounded-2xl bg-white overflow-hidden ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    {/* Team Header */}
                    <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamAvatar
                          teamName={team.team_name}
                          teamColor={team.team_colour}
                          className="w-8 h-8 font-bold"
                        />
                        <div>
                          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                            {team.team_name}
                          </h3>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            Colour: {team.team_colour}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-white px-2.5 py-1 rounded-md border border-gray-200 text-gray-600">
                          {playersList.length} Players
                        </span>
                        <Button
                          size="sm"
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() =>
                            setSelectedTeamId(
                              isSelected ? null : team.team_id
                            )
                          }
                          className={`text-xs font-bold ${
                            isSelected
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select Team'}
                        </Button>
                      </div>
                    </div>

                    {/* Players Grid */}
                    <CardContent className="p-4 space-y-3">
                      {playersList.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <User className="w-8 h-8 mx-auto mb-1 opacity-40" />
                          <p className="text-xs">No players in this team yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {playersList.map((player: Player, idx: number) => {
                            const initial = player.profile_name
                              ? player.profile_name.charAt(0).toUpperCase()
                              : 'P';
                            const email = player.user_profile?.email;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/50 hover:bg-gray-100/80 border border-gray-100 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
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

                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
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

        {/* Bottom Join CTA Bar */}
        <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 rounded-2xl shadow-sm border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 justify-center sm:justify-start">
                {selectedTeamId ? (
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Eye className="w-4 h-4 text-indigo-600" />
                )}
                {selectedTeamId ? 'Ready to participate?' : 'Join as Spectator'}
              </h3>
              <p className="text-xs text-gray-600">
                {selectedTeamId
                  ? 'You have selected a team to join as an active player.'
                  : 'No team selected. You will join the game session as a Spectator.'}
              </p>
            </div>

            <Button
              onClick={() => handleJoin(selectedTeamId || undefined)}
              disabled={isJoining}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
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
    </div>
  );
}
