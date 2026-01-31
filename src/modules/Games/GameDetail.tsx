import { useNavigate, useParams } from 'react-router-dom';
import {
  DECK_ROUTE,
  DICE_ROLLER_ROUTE,
  MAP_ROUTE,
  ASK_QUESTION_ROUTE,
  ANSWER_QUESTION_ROUTE,
} from '../../constants/routes';
import { useFetchMyTeamQuery } from '../../apis/gameApi';
import { HeroSection } from './HeroSection';
import { ModulesSection, GameModule } from './ModulesSection';
import { TeamSection } from './TeamSection';
import { StatsSection } from './StatsSection';

export default function GameDetail() {
  const navigate = useNavigate();
  const { gameId } = useParams();

  // Fetch Team Data
  const {
    data: team,
    isLoading: isTeamLoading,
    error: teamError,
  } = useFetchMyTeamQuery(gameId!);

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
      id: 4,
      name: 'Character Sheets',
      icon: '📋',
      description: 'Player characters',
      color: 'from-purple-500 to-indigo-500',
      route: '',
    },
    {
      id: 5,
      name: 'Inventory',
      icon: '🎒',
      description: 'Manage items & loot',
      color: 'from-orange-500 to-amber-500',
      route: '',
    },
    {
      id: 6,
      name: 'Combat Tracker',
      icon: '⚔️',
      description: 'Track initiative & HP',
      color: 'from-rose-500 to-red-500',
      route: '',
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
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection game={gameInfo} onBack={onBack} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <TeamSection team={team} isLoading={isTeamLoading} error={teamError} />
        <ModulesSection
          modules={modules}
          gameId={gameId || '123'}
          teamId={team?.team_id || '123'}
        />
        <StatsSection />
      </div>
    </div>
  );
}
