import React from 'react';
import {
  Gamepad2,
  RefreshCcw,
  LogOut,
} from 'lucide-react';
import { GameCard } from './GameCard';
import { Header } from '../../components/ui/header';
import { Button } from '../../components/ui/button';
import { useFetchGamesQuery } from '../../apis/gameApi';
import { Game } from '../../models/Game';
import { useNavigate } from 'react-router-dom';
import { getRoute } from '../../utils/getRoute';
import { GAME_DETAIL_ROUTE, LOGIN_ROUTE } from '../../constants/routes';
import { useDispatch } from 'react-redux';
import { clearToken } from '../../redux/auth-reducer';

export default function GameList() {
  const { data, isLoading, isError, refetch } = useFetchGamesQuery(null);
  let games = data?.results || [];
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(clearToken());
    navigate(LOGIN_ROUTE);
  };

  const handleSelectGame = (game: Game) => {
    navigate(getRoute(GAME_DETAIL_ROUTE, { gameId: game.game_id }));
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 text-sm">Loading games...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 max-w-sm bg-white rounded-xl shadow-lg border border-red-100">
          <div className="text-red-500 mb-3">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900">
            Failed to load games
          </h3>
          <p className="text-gray-500 text-sm mt-2 mb-4">
            Something went wrong while fetching the game list.
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* Header */}
      <Header
        title="Active Games"
        showBack={false}
        icon={<Gamepad2 className="w-5 h-5 mr-2 text-indigo-600" />}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              className="text-gray-400 hover:text-indigo-600 hover:bg-white rounded-full"
              title="Refresh List"
            >
              <RefreshCcw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-600 hover:bg-white rounded-full"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      {/* Grid Layout */}
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3 py-4 px-4">
        {games.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
            <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active games found.</p>
          </div>
        ) : (
          games.map((game: Game) => (
            <GameCard
              key={game.game_id}
              game={game}
              onClick={handleSelectGame}
            />
          ))
        )}
      </div>
    </div>
  );
}
