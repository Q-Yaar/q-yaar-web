import { useNavigate, useParams } from 'react-router-dom';
import {
  DECK_ROUTE,
  DICE_ROLLER_ROUTE,
  MAP_ROUTE,
  ASK_QUESTION_ROUTE,
  ANSWER_QUESTION_ROUTE,
  FACTS_ROUTE,
} from '../../constants/routes';
import { useFetchMyTeamQuery, useFetchGameDetailsQuery } from '../../apis/gameApi';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { ModulesSection, GameModule } from './ModulesSection';
import { LocationCard } from './LocationCard';
import { TeamModal } from './TeamModal';
import { useState } from 'react';
import { TeamAvatar } from 'components/TeamAvatar';
import { RefreshCw } from 'lucide-react';

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

  const teams = game?.teams || [];

  const onBack = () => navigate(-1);

  // Configuration Data
  const gameInfo = {
    title: 'Dungeons & Dragons',
    description: 'Classic fantasy tabletop RPG adventure',
    image:
      'https://images.unsplash.com/photo-1556103255-4443dbae8e5a?w=400&h=300&fit=crop',
    players: '3-6',
    duration: '3-4 hours',
    category: 'RPG',
  };

  const modules: GameModule[] = [
    {
      id: 1,
      name: 'Card Deck',
      icon: '🃏',
      description: 'Manage and draw cards',
      color: 'from-red-500 to-pink-500',
      route: DECK_ROUTE,
    },
    {
      id: 2,
      name: 'Map',
      icon: '🗺️',
      description: 'Interactive game map',
      color: 'from-green-500 to-emerald-500',
      route: MAP_ROUTE,
    },
    {
      id: 3,
      name: 'Dice Roller',
      icon: '🎲',
      description: 'Roll virtual dice',
      color: 'from-blue-500 to-cyan-500',
      route: DICE_ROLLER_ROUTE,
    },
    {
      id: 7,
      name: 'Ask Question',
      icon: '❓',
      description: 'Ask questions to other teams',
      color: 'from-indigo-500 to-violet-500',
      route: ASK_QUESTION_ROUTE,
    },
    {
      id: 8,
      name: 'Answer Question',
      icon: '🙋',
      description: 'Answer pending questions',
      color: 'from-teal-500 to-green-500',
      route: ANSWER_QUESTION_ROUTE,
    },
    {
      id: 9,
      name: 'Facts',
      icon: '📜',
      description: 'History of facts',
      color: 'from-orange-500 to-amber-500',
      route: FACTS_ROUTE,
    },
  ];

  const isPendingGame = game?.game_status?.toUpperCase() === 'PENDING';

  return (
    <div className="min-h-screen bg-gray-50">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <LocationCard gameId={gameId || '123'} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModulesSection
            modules={modules}
            gameId={gameId || '123'}
            teamId={team?.team_id || '123'}
          />
          
        </div>
      </div>
    </div>
  );
}

