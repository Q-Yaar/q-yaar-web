import { ChevronRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardTitle } from 'components/ui/card';
import { useGetDeckStatsQuery } from '../../apis/deckApi';
import { getRoute } from '../../utils/getRoute';
import { DECK_ROUTE } from '../../constants/routes';
import { Team } from '../../models/Team';

interface DecksCardProps {
  gameId: string;
  /** The viewer's own team — every team's deck is the same shared deck, so
   * there's nothing to gain from listing one per team; this only ever
   * shows the viewer's own. Never rendered for a spectator (no team to
   * have a deck at all) — see GameDetail.tsx's isPlayerTeam gate. */
  team: Team;
}

export function DecksCard({ gameId, team }: DecksCardProps) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useGetDeckStatsQuery(team.team_id);

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all group border-gray-200 hover:border-indigo-300"
      onClick={() => navigate(getRoute(DECK_ROUTE, { gameId, teamId: team.team_id }))}
    >
      <CardContent className="flex items-center gap-4 py-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <Layers className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex flex-col min-w-0 flex-1 text-left">
          <CardTitle className="text-base group-hover:text-indigo-600 transition-colors">
            Your Deck
          </CardTitle>
          {isLoading || !stats ? (
            <div className="animate-pulse mt-1">
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {stats.deck_cards} in deck · {stats.hand_cards} in hand · {stats.discard_cards} discarded
            </p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
      </CardContent>
    </Card>
  );
}
