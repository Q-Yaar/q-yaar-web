import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Calendar, User, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import {
  useCreateFactMutation,
  useDeleteFactMutation,
  useGetFactsQuery,
} from '../../apis/api';
import { useFetchMyTeamQuery, useFetchTeamsQuery } from '../../apis/gameApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

export function FactsModule() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const [newFactText, setNewFactText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState('all');

  // API Hooks
  const { data: factsData, isLoading: isFactsLoading } = useGetFactsQuery(
    { game_id: gameId! },
    { skip: !gameId },
  );
  const [createFact] = useCreateFactMutation();
  const [deleteFact] = useDeleteFactMutation();

  const { data: currentTeam } = useFetchMyTeamQuery(gameId!, { skip: !gameId });
  const { data: teamsData } = useFetchTeamsQuery(gameId!, { skip: !gameId });

  // Current User Data from Redux
  const auth = useSelector((state: RootState) => state.auth.authData);
  const user = auth?.user?.data;
  const playerProfile = auth?.profiles?.['PLAYER']?.data;

  const currentUserId = user?.user_id;
  const currentUserName =
    playerProfile?.profile_name || user?.email || 'Unknown User';
  const currentUserTeamId = currentTeam?.team_id;
  const currentUserTeamName = currentTeam?.team_name;
  // Fallback color or use team_colour from API
  const currentUserTeamColor = currentTeam?.team_colour;

  const facts = factsData?.results || [];

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim() || !gameId || !currentUserTeamId) return;

    try {
      await createFact({
        game_id: gameId,
        team_id: currentUserTeamId, // Required by API spec example
        fact_type: 'GENERAL',
        fact_info: {
          text: newFactText,
          playerId: currentUserId,
          playerName: currentUserName,
          teamId: currentUserTeamId,
          teamName: currentUserTeamName,
          teamColor: currentUserTeamColor, // Storing processed color class for now
        },
      }).unwrap();
      setNewFactText('');
    } catch (error) {
      console.error('Failed to create fact:', error);
    }
  };

  const handleDeleteFact = async (factId: string) => {
    try {
      await deleteFact(factId).unwrap();
    } catch (error) {
      console.error('Failed to delete fact:', error);
    }
  };

  const filteredFacts = facts.filter((fact) => {
    const info = fact.fact_info;
    const matchTeam = selectedTeam === 'all' || info.teamId === selectedTeam;
    // We filter by playerId stored in fact_info
    const matchPlayer =
      selectedPlayer === 'all' || info.playerId === selectedPlayer;
    return matchTeam && matchPlayer;
  });

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const TEAMS = [
    { id: 'all', name: 'All Teams' },
    ...(teamsData || []).map((t) => ({ id: t.team_id, name: t.team_name })),
  ];

  // We extract unique players from loaded facts for the filter dropdown
  const uniquePlayers = Array.from(
    new Set(
      facts.map((f) =>
        JSON.stringify({
          id: f.fact_info.playerId,
          name: f.fact_info.playerName,
        }),
      ),
    ),
  )
    .map((s) => JSON.parse(s))
    .filter((p) => p.id && p.name);

  const PLAYERS = [{ id: 'all', name: 'All Players' }, ...uniquePlayers];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">📜</span> History of Facts
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Add Fact Section */}
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-white pb-4">
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add New Fact
            </CardTitle>
            <CardDescription>
              Share a new event or discovery with the game history.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleAddFact} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fact-text" className="sr-only">
                  Fact Text
                </Label>
                <Input
                  id="fact-text"
                  placeholder={
                    !currentUserTeamId
                      ? 'Loading team info...'
                      : "What happened? e.g. 'We found a secret door...'"
                  }
                  value={newFactText}
                  onChange={(e) => setNewFactText(e.target.value)}
                  className="min-h-[80px] text-lg py-3"
                  disabled={!currentUserTeamId}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  disabled={!currentUserTeamId || !newFactText.trim()}
                >
                  Post Fact
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex-1 space-y-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> Filter by Team
            </Label>
            <div className="relative">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none bg-gray-50 border hover:bg-white transition-colors cursor-pointer"
              >
                {TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3" /> Filter by Player
            </Label>
            <div className="relative">
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none bg-gray-50 border hover:bg-white transition-colors cursor-pointer"
              >
                {PLAYERS.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:left-8 before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {isFactsLoading ? (
            <div className="text-center py-12 text-gray-500 ml-16">
              <p>Loading details...</p>
            </div>
          ) : filteredFacts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 ml-16">
              <p>No facts found for the selected filters.</p>
            </div>
          ) : (
            filteredFacts.map((fact) => (
              <div
                key={fact.fact_id}
                className="relative flex items-start gap-6 group"
              >
                {/* Timeline Icon/Dot with Time */}
                <div className="flex flex-col items-center z-10">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-slate-100 shadow-md shrink-0 text-center">
                    <span
                      className={`text-xs font-bold leading-none ${fact.fact_info.teamColor?.split(' ')[2] || 'text-gray-600'}`}
                    >
                      {new Date(fact.created)
                        .toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          hour12: true,
                        })
                        .replace(' ', '')}
                    </span>
                  </div>
                </div>

                {/* Card */}
                <Card
                  className={`flex-1 p-0 border-l-4 shadow-sm hover:shadow-md transition-shadow ${fact.fact_info.teamColor?.replace('bg-', 'border-l-').split(' ')[0] || 'border-l-gray-300'}`}
                >
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-gray-50/50 rounded-t-lg">
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${fact.fact_info.teamColor?.split(' ')[2] || 'text-gray-600'}`}
                      >
                        {fact.fact_info.teamName || 'Unknown Team'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{' '}
                        {formatDate(fact.created)}
                      </span>
                    </div>
                    {fact.fact_info.playerId === currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 -mr-2"
                        onClick={() => handleDeleteFact(fact.fact_id)}
                        aria-label="Delete fact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="py-4 px-4">
                    <p className="text-gray-800 text-base leading-relaxed">
                      {fact.fact_info.text}
                    </p>
                  </CardContent>
                  <CardFooter className="py-2 px-4 bg-gray-50/30 border-t flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {fact.fact_info.playerName?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {fact.fact_info.playerName || 'Unknown Player'}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
