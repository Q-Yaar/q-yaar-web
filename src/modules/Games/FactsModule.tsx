import React, { useState } from 'react';
import { Header } from '../../components/ui/header';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  User,
  Users,
  Edit2,
  X,
  Check,
} from 'lucide-react';
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
  useUpdateFactMutation,
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

  // Edit State
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editFactText, setEditFactText] = useState('');

  // API Hooks
  const { data: factsData, isLoading: isFactsLoading } = useGetFactsQuery(
    { game_id: gameId! },
    { skip: !gameId },
  );
  const [createFact, { isLoading: isCreating }] = useCreateFactMutation();
  const [deleteFact, { isLoading: isDeleting }] = useDeleteFactMutation();
  const [updateFact, { isLoading: isUpdating }] = useUpdateFactMutation();

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
        team_id: currentUserTeamId,
        fact_type: 'TEXT',
        fact_info: {
          text: newFactText,
          playerId: currentUserId,
          playerName: currentUserName,
          teamId: currentUserTeamId,
          teamName: currentUserTeamName,
          teamColor: currentUserTeamColor,
        },
      }).unwrap();
      setNewFactText('');
    } catch (error) {
      console.error('Failed to create fact:', error);
      // Ideally show a toast here
    }
  };

  const handleDeleteFact = async (factId: string) => {
    if (!window.confirm('Are you sure you want to delete this fact?')) return;
    try {
      await deleteFact(factId).unwrap();
    } catch (error) {
      console.error('Failed to delete fact:', error);
    }
  };

  const startEditing = (fact: any) => {
    setEditingFactId(fact.fact_id);
    setEditFactText(fact.fact_info.text);
  };

  const cancelEditing = () => {
    setEditingFactId(null);
    setEditFactText('');
  };

  const handleUpdateFact = async () => {
    if (!editingFactId || !editFactText.trim()) return;

    try {
      const factToUpdate = facts.find((f) => f.fact_id === editingFactId);
      if (!factToUpdate) return;

      await updateFact({
        fact_id: editingFactId,
        fact_info: {
          ...factToUpdate.fact_info,
          text: editFactText,
        },
      }).unwrap();
      setEditingFactId(null);
      setEditFactText('');
    } catch (error) {
      console.error('Failed to update fact:', error);
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
      {/* Header */}
      <Header
        title="History of Facts"
        icon={<span className="text-2xl">📜</span>}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Add Fact Section */}
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-white pb-4">
            <CardTitle className="text-indigo-900 flex items-center gap-2 text-left">
              <Plus className="w-5 h-5" /> Add New Fact
            </CardTitle>
            <CardDescription className="text-left">
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
                  disabled={!currentUserTeamId || isCreating}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  disabled={
                    !currentUserTeamId || !newFactText.trim() || isCreating
                  }
                >
                  {isCreating ? 'Posting...' : 'Post Fact'}
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
                      <div className="flex gap-1">
                        {editingFactId === fact.fact_id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:bg-green-50"
                              onClick={handleUpdateFact}
                              disabled={isUpdating}
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              onClick={cancelEditing}
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                              onClick={() => startEditing(fact)}
                              title="Edit fact"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteFact(fact.fact_id)}
                              disabled={isDeleting}
                              title="Delete fact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="py-4 px-4">
                    {editingFactId === fact.fact_id ? (
                      <Input
                        value={editFactText}
                        onChange={(e) => setEditFactText(e.target.value)}
                        className="w-full"
                        autoFocus
                      />
                    ) : (
                      <p className="text-gray-800 text-base leading-relaxed">
                        {fact.fact_info.text}
                      </p>
                    )}
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
