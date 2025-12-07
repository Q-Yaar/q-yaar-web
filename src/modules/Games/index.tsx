import React from "react";
import {
  Gamepad2,
  Calendar,
  User,
  Hash,
  RefreshCcw
} from "lucide-react";
import { useFetchGamesQuery } from "../../apis/gameApi";
import { Game } from "../../models/Game";
import { useNavigate } from "react-router-dom";
import { getRoute } from "../../utils/getRoute";
import { GAME_DETAIL_ROUTE } from "../../constants/routes";

export default function GameList() {
  const { data, isLoading, isError, refetch } = useFetchGamesQuery(null);
  const games = data?.results || [];
  const navigate = useNavigate();

  const handleSelectGame = (game: Game) => {
    navigate(getRoute(GAME_DETAIL_ROUTE, { gameId: game.game_id }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "IN_PROGRESS": return "bg-green-100 text-green-800 border-green-200";
      case "COMPLETED": return "bg-gray-100 text-gray-800 border-gray-200";
      case "CANCELLED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Helper to format Game Type text (e.g., HIDE_N_SEEK -> Hide & Seek)
  const formatGameType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
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
          <h3 className="text-lg font-medium text-gray-900">Failed to load games</h3>
          <p className="text-gray-500 text-sm mt-2 mb-4">Something went wrong while fetching the game list.</p>
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 text-left">Active Games</h1>
          <p className="text-gray-500 text-sm mt-1">
            Join a game using the code or view details
          </p>
        </div>
        <button
          onClick={refetch}
          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-white"
          title="Refresh List"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Grid Layout */}
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {games.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
            <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active games found.</p>
          </div>
        ) : (
          games.map((game: Game) => (
            <div
              key={game.game_id}
              onClick={() => handleSelectGame(game)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 overflow-hidden group"
            >
              {/* Card Header: Type & Status */}
              <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {formatGameType(game.game_type)}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(game.created).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(game.game_status)}`}>
                  {game.game_status}
                </span>
              </div>

              {/* Card Body: Name & Code */}
              <div className="px-5 py-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate text-left" title={game.name}>
                  {game.name}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-4 h-10 text-left">
                  {game.description}
                </p>

                {/* Game Code Box */}
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between border border-gray-200 group-hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-mono font-bold text-gray-700">
                      {game.game_code}
                    </span>
                  </div>
                  <span className="text-xs text-indigo-600 font-medium">CODE</span>
                </div>
              </div>

              {/* Card Footer: Game Master */}
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                  {game.game_master.profile_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate text-left">
                    {game.game_master.profile_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <User className="w-3 h-3" /> Game Master
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}