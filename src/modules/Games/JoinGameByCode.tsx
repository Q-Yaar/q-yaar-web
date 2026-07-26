import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useFetchGameByCodeQuery,
  useJoinGameMutation,
  useJoinTeamMutation,
} from '../../apis/gameApi';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { getLabel } from '../../utils/utils';
import { getRoute } from '../../utils/getRoute';
import { GAME_DETAIL_ROUTE, HOME_ROUTE } from '../../constants/routes';
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
  Share2,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react';

export default function JoinGameByCode() {
  const navigate = useNavigate();
  const { gameCode } = useParams<{ gameCode: string }>();

  const {
    data: game,
    isLoading: isGameLoading,
    isError: isGameError,
    refetch,
  } = useFetchGameByCodeQuery(gameCode || '', {
    skip: !gameCode,
  });

  const [joinGame, { isLoading: isJoiningGame }] = useJoinGameMutation();
  const [joinTeam, { isLoading: isJoiningTeam }] = useJoinTeamMutation();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isJoining = isJoiningGame || isJoiningTeam;

  const teams: Team[] = game?.teams || [];

  // Calculate total players count
  const totalPlayersCount = teams.reduce(
    (acc, t) => acc + (t.players ? t.players.length : 0),
    0
  );

  const shareableUrl = `${window.location.origin}/join/${gameCode}`;

  const handleCopyCode = () => {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${game?.name || 'Q-Yaar Game'}`,
          text: `Join my Q-Yaar game "${game?.name || ''}" using code ${gameCode}!`,
          url: shareableUrl,
        });
        return;
      } catch (e) {
        // Fallback to clipboard if share was cancelled or failed
      }
    }
    handleCopyLink();
  };

  const handleJoin = async (targetTeamId?: string) => {
    if (!game?.game_id) return;
    setErrorMessage(null);

    try {
      if (targetTeamId) {
        await joinTeam({ gameId: game.game_id, teamId: targetTeamId }).unwrap();
      } else {
        await joinGame(game.game_id).unwrap();
      }
      // Successfully joined -> navigate to Active Game Detail page
      navigate(getRoute(GAME_DETAIL_ROUTE, { gameId: game.game_id }));
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
        title="Game Not Found"
        description={`We couldn't find a game matching the code "${gameCode}". Check the link or code and try again.`}
        action={() => navigate(HOME_ROUTE)}
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

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      <Header
        title={`Join Game: ${game.name}`}
        onBack={() => navigate(HOME_ROUTE)}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={handleShareLink}
            className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 py-1 px-3 h-8 rounded-xl flex items-center gap-1.5"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Share Link</span>
              </>
            )}
          </Button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-left">
        {/* Main Banner Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-6 sm:p-8 space-y-6 relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {getVisibilityBadge(game.game_visibility_mode)}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                    game.game_status
                  )}`}
                >
                  {getLabel(game.game_status)}
                </span>
              </div>

              {/* Game Code Display */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/15">
                <Hash className="w-4 h-4 text-indigo-300" />
                <span className="text-sm font-mono font-bold tracking-widest text-indigo-100">
                  {game.game_code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-1"
                  title="Copy Game Code"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-indigo-300 hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {game.name}
              </h1>
              {game.game_type && (
                <p className="text-sm text-indigo-200/90 font-medium">
                  {getLabel(game.game_type)}
                </p>
              )}
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-indigo-200">
                <User className="w-4 h-4 text-indigo-300 shrink-0" />
                <span className="truncate">
                  Host: <strong className="text-white font-semibold">{game.game_master?.profile_name || 'Host'}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-indigo-200">
                <Users className="w-4 h-4 text-indigo-300 shrink-0" />
                <span>
                  Teams: <strong className="text-white font-semibold">{teams.length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-indigo-200 col-span-2 sm:col-span-1">
                <Shield className="w-4 h-4 text-indigo-300 shrink-0" />
                <span>
                  Players: <strong className="text-white font-semibold">{totalPlayersCount}</strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Select Team Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Select a Team to Join</span>
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              Choose your team before entering
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team) => {
              const isSelected = selectedTeamId === team.team_id;
              const isSpectatorTeam =
                team.team_type?.toUpperCase() === 'SPECTATOR' ||
                team.team_name.toUpperCase() === 'SPECTATORS';

              return (
                <Card
                  key={team.team_id}
                  onClick={() => setSelectedTeamId(team.team_id)}
                  className={`cursor-pointer transition-all duration-200 rounded-2xl border-2 overflow-hidden ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm bg-white'
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamAvatar
                          teamName={team.team_name}
                          teamColor={team.team_colour}
                          className="w-10 h-10 text-base font-bold shadow-sm"
                        />
                        <div>
                          <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                            {team.team_name}
                            {isSpectatorTeam && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                Spectator
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 font-medium">
                            {team.players ? team.players.length : 0} {team.players?.length === 1 ? 'Player' : 'Players'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Players List Preview */}
                    {team.players && team.players.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1.5">
                          {team.players.map((p: Player, idx: number) => (
                            <span
                              key={p.user_profile?.user_id || idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {p.profile_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Direct Join button inside Card */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(team.team_id);
                      }}
                      disabled={isJoining}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`w-full text-xs font-bold rounded-xl py-2 h-9 transition-all ${
                        isSelected
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          : 'border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700'
                      }`}
                    >
                      {isJoining && selectedTeamId === team.team_id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          Join {team.team_name}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="font-bold text-gray-900 text-sm">
              Don't want to join a team?
            </h4>
            <p className="text-xs text-gray-500">
              You can join as a spectator to view the game in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => handleJoin()}
              disabled={isJoining}
              className="flex-1 sm:flex-none border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl h-11 px-5"
            >
              {isJoining && !selectedTeamId ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Eye className="w-4 h-4 text-gray-500" />
                  Join as Spectator
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
