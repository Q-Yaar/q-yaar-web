import React, { useState } from "react";
import { Grid, List, Clock, Users, ChevronRight, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRoute } from "../../utils/getRoute";
import { GAME_DETAIL_ROUTE } from "../../constants/routes";
import { Game } from "../../models/Game";

// Mock data for games
const mockGames = [
  {
    id: 1,
    game_id: "3232",
    title: "Dungeons & Dragons",
    description: "Classic fantasy tabletop RPG adventure",
    image:
      "https://images.unsplash.com/photo-1556103255-4443dbae8e5a?w=400&h=300&fit=crop",
    players: "3-6",
    duration: "3-4 hours",
    status: "active",
    lastPlayed: "2 hours ago",
    category: "RPG",
  },
  {
    id: 2,
    game_id: "3232",
    title: "Cosmic Conquest",
    description: "Strategic space exploration and warfare",
    image:
      "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=400&h=300&fit=crop",
    players: "2-4",
    duration: "2-3 hours",
    status: "completed",
    lastPlayed: "1 day ago",
    category: "Strategy",
  },
  {
    id: 3,
    game_id: "3232",
    title: "Mystery Mansion",
    description: "Solve puzzles and uncover secrets",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop",
    players: "4-8",
    duration: "1-2 hours",
    status: "active",
    lastPlayed: "5 hours ago",
    category: "Mystery",
  },
  {
    id: 4,
    game_id: "3232",
    title: "Battle Royale Arena",
    description: "Last person standing wins",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop",
    players: "2-10",
    duration: "30-60 min",
    status: "upcoming",
    lastPlayed: "Never",
    category: "Action",
  },
  {
    id: 5,
    game_id: "3232",
    title: "Medieval Kingdom",
    description: "Build and expand your empire",
    image:
      "https://images.unsplash.com/photo-1518893063132-36e46dbe2428?w=400&h=300&fit=crop",
    players: "2-5",
    duration: "2-4 hours",
    status: "active",
    lastPlayed: "1 hour ago",
    category: "Strategy",
  },
  {
    id: 6,
    game_id: "3232",
    title: "Horror Escape",
    description: "Survive the night in a haunted location",
    image:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&h=300&fit=crop",
    players: "3-6",
    duration: "2-3 hours",
    status: "completed",
    lastPlayed: "3 days ago",
    category: "Horror",
  },
];

export default function GameList() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("grid");

  const games = mockGames;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSelectGame = (game: Game) => {
    navigate(getRoute(GAME_DETAIL_ROUTE, { gameId: game.game_id }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">My Games</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Games Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {games.length === 0 ? (
          <div className="text-center py-12">
            <Gamepad2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No games found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or filters
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                onClick={() => handleSelectGame(game as any)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        game.status
                      )}`}
                    >
                      {game.status}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {game.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{game.players}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{game.duration}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Last: {game.lastPlayed}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div
                key={game.id}
                onClick={() => handleSelectGame(game as any)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {game.title}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          game.status
                        )}`}
                      >
                        {game.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                      {game.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{game.players}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{game.duration}</span>
                      </div>
                      <span>Last: {game.lastPlayed}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
