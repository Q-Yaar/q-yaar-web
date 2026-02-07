import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Calendar,
  User,
  Users,
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

// Mock Data Types
interface Fact {
  id: string;
  text: string;
  timestamp: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
}

// Mock Initial Data
const INITIAL_FACTS: Fact[] = [
  {
    id: '1',
    text: 'The Red Dragons discovered the hidden cave system beneath the mountains.',
    timestamp: '2023-10-27T10:30:00Z',
    playerId: 'p1',
    playerName: 'Alex Warrior',
    teamId: 't1',
    teamName: 'Red Dragons',
    teamColor: 'bg-red-100 border-red-200 text-red-800',
  },
  {
    id: '2',
    text: 'Blue Knights formed an alliance with the Elves of the West.',
    timestamp: '2023-10-28T14:15:00Z',
    playerId: 'p2',
    playerName: 'Sarah Mage',
    teamId: 't2',
    teamName: 'Blue Knights',
    teamColor: 'bg-blue-100 border-blue-200 text-blue-800',
  },
  {
    id: '3',
    text: 'Green Rangers lost their supply wagon crossing the river.',
    timestamp: '2023-10-29T09:00:00Z',
    playerId: 'p3',
    playerName: 'John Rogue',
    teamId: 't3',
    teamName: 'Green Rangers',
    teamColor: 'bg-green-100 border-green-200 text-green-800',
  },
];

const TEAMS = [
  { id: 'all', name: 'All Teams' },
  { id: 't1', name: 'Red Dragons' },
  { id: 't2', name: 'Blue Knights' },
  { id: 't3', name: 'Green Rangers' },
];

const PLAYERS = [
  { id: 'all', name: 'All Players' },
  { id: 'p1', name: 'Alex Warrior' },
  { id: 'p2', name: 'Sarah Mage' },
  { id: 'p3', name: 'John Rogue' },
  { id: 'currentUser', name: 'Current User' }, // Simulating current user
];

export function FactsModule() {
  const navigate = useNavigate();
  const { gameId } = useParams();

  // State
  const [facts, setFacts] = useState<Fact[]>(INITIAL_FACTS);
  const [newFactText, setNewFactText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState('all');

  // Simulated Current User
  const currentUserId = 'currentUser';
  const currentUserTeamId = 't1';
  const currentUserName = 'Current User';
  const currentUserTeamName = 'Red Dragons';
  const currentUserTeamColor = 'bg-red-100 border-red-200 text-red-800';

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;

    const newFact: Fact = {
      id: Date.now().toString(),
      text: newFactText,
      timestamp: new Date().toISOString(),
      playerId: currentUserId,
      playerName: currentUserName,
      teamId: currentUserTeamId,
      teamName: currentUserTeamName,
      teamColor: currentUserTeamColor,
    };

    setFacts([newFact, ...facts]);
    setNewFactText('');
  };

  const handleDeleteFact = (id: string) => {
    setFacts(facts.filter((fact) => fact.id !== id));
  };

  const filteredFacts = facts.filter((fact) => {
    const matchTeam = selectedTeam === 'all' || fact.teamId === selectedTeam;
    const matchPlayer =
      selectedPlayer === 'all' || fact.playerId === selectedPlayer;
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
                  placeholder="What happened? e.g. 'We found a secret door...'"
                  value={newFactText}
                  onChange={(e) => setNewFactText(e.target.value)}
                  className="min-h-[80px] text-lg py-3" // Making it look a bit like a textarea but using Input for now as per constraints
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
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
              {/* Custom arrow for select if needed, but native is fine for MVP */}
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
          {filteredFacts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 ml-16">
              <p>No facts found for the selected filters.</p>
            </div>
          ) : (
            filteredFacts.map((fact) => (
              <div
                key={fact.id}
                className="relative flex items-start gap-6 group"
              >
                {/* Timeline Icon/Dot with Time */}
                <div className="flex flex-col items-center z-10">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-slate-100 shadow-md shrink-0 text-center">
                    <span
                      className={`text-xs font-bold leading-none ${fact.teamColor.split(' ')[2] || 'text-gray-600'}`}
                    >
                      {new Date(fact.timestamp)
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
                  className={`flex-1 p-0 border-l-4 shadow-sm hover:shadow-md transition-shadow ${fact.teamColor.replace('bg-', 'border-l-').split(' ')[0]}`}
                >
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-gray-50/50 rounded-t-lg">
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${fact.teamColor.split(' ')[2] || 'text-gray-600'}`}
                      >
                        {fact.teamName}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{' '}
                        {formatDate(fact.timestamp)}
                      </span>
                    </div>
                    {fact.playerId === currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 -mr-2"
                        onClick={() => handleDeleteFact(fact.id)}
                        aria-label="Delete fact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="py-4 px-4">
                    <p className="text-gray-800 text-base leading-relaxed">
                      {fact.text}
                    </p>
                  </CardContent>
                  <CardFooter className="py-2 px-4 bg-gray-50/30 border-t flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {fact.playerName.charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {fact.playerName}
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
