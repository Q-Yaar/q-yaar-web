import React, { useState } from 'react';
import { Header } from '../../components/ui/header';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { FactCard } from './FactCard';
import { AddFactCard } from './AddFactCard';
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
import LoadingScreen from 'components/LoadingScreen';
import ErrorScreen from 'components/ErrorScreen';

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

  const {
    data: factsData,
    isLoading: isFactsLoading,
    isError: isFactsError,
    refetch: refetchFacts,
  } = useGetFactsQuery(
    {
      game_id: gameId!,
      team_id: selectedTeam === 'all' ? undefined : selectedTeam,
    },
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
          op_type: 'plain_text',
          op_meta: {
            text: newFactText,
            player_name: currentUserName,
            player_id: currentUserId,
            team_name: currentUserTeamName,
            team_id: currentUserTeamId,
            team_color: currentUserTeamColor,
          },
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

  const filteredFacts = facts;

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

  if (isFactsLoading) return <LoadingScreen />;

  if (isFactsError)
    return (
      <ErrorScreen
        title="Failed to load facts"
        description="Something went wrong while fetching the facts."
        action={refetchFacts}
      />
    );

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
        {/* Add Fact Section */}
        <AddFactCard
          onAddFact={handleAddFact}
          newFactText={newFactText}
          setNewFactText={setNewFactText}
          currentUserTeamId={currentUserTeamId}
          isCreating={isCreating}
        />

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
              <FactCard
                key={fact.fact_id}
                fact={fact}
                currentUserId={currentUserId}
                editingFactId={editingFactId}
                editFactText={editFactText}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
                onEdit={startEditing}
                onCancelEdit={cancelEditing}
                onUpdate={handleUpdateFact}
                onDelete={handleDeleteFact}
                setEditFactText={setEditFactText}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
