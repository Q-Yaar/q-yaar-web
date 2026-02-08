import { useNavigate, useParams } from 'react-router-dom';
import {
  DECK_ROUTE,
  DICE_ROLLER_ROUTE,
  MAP_ROUTE,
  ASK_QUESTION_ROUTE,
  ANSWER_QUESTION_ROUTE,
  FACTS_ROUTE,
} from '../../constants/routes';
import { useFetchMyTeamQuery } from '../../apis/gameApi';
import { Header } from '../../components/ui/header';
import { ModulesSection, GameModule } from './ModulesSection';
import { TeamSection } from './TeamSection';
import { TeamModal } from './TeamModal';
import { useState } from 'react';
import { useFetchTeamsQuery } from '../../apis/gameApi';
import { TeamAvatar } from 'components/TeamAvatar';

export default function GameDetail() {
  const navigate = useNavigate();
  const { gameId } = useParams();

  // Fetch Team Data
  const {
    data: team,
    isLoading: isTeamLoading,
    error: teamError,
  } = useFetchMyTeamQuery(gameId!);

  const { data: teams } = useFetchTeamsQuery(gameId!);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Game Modules"
        onBack={onBack}
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors flex items-center gap-2"
          >
            <TeamAvatar
              teamName={team?.team_name || 'Select Team'}
              teamColor={team?.team_colour || 'gray'}
              className="w-4 h-4"
            />
            {team?.team_name || 'Select Team'}
          </button>
        }
      />

      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teams={teams || []}
        currentTeam={team || null}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ModulesSection
          modules={modules}
          gameId={gameId || '123'}
          teamId={team?.team_id || '123'}
        />
      </div>
    </div>
  );
}
