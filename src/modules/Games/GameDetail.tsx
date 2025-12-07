import { Clock, Users, Trophy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DICE_ROLLER_ROUTE, MAP_ROUTE } from "../../constants/routes";
import { getRoute } from "../../utils/getRoute";

export default function GameDetail() {
  const game = {
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
  };
  const modules = [
    {
      id: 1,
      name: "Card Deck",
      icon: "🃏",
      description: "Manage and draw cards",
      color: "from-red-500 to-pink-500",
      route: "",
    },
    {
      id: 2,
      name: "Map",
      icon: "🗺️",
      description: "Interactive game map",
      color: "from-green-500 to-emerald-500",
      route: MAP_ROUTE,
    },
    {
      id: 3,
      name: "Dice Roller",
      icon: "🎲",
      description: "Roll virtual dice",
      color: "from-blue-500 to-cyan-500",
      route: DICE_ROLLER_ROUTE,
    },
    {
      id: 4,
      name: "Character Sheets",
      icon: "📋",
      description: "Player characters",
      color: "from-purple-500 to-indigo-500",
      route: "",
    },
    {
      id: 5,
      name: "Inventory",
      icon: "🎒",
      description: "Manage items & loot",
      color: "from-orange-500 to-amber-500",
      route: "",
    },
    {
      id: 6,
      name: "Combat Tracker",
      icon: "⚔️",
      description: "Track initiative & HP",
      color: "from-rose-500 to-red-500",
      route: "",
    },
  ];

  const navigate = useNavigate();

  const onBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-br from-indigo-900 to-purple-900">
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>Back</span>
        </button>

        {/* Game Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  {game.title}
                </h1>
                <p className="text-white/90 text-lg mb-3">{game.description}</p>
                <div className="flex items-center space-x-4 text-white/80 text-sm">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{game.players} players</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{game.duration}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Trophy className="w-4 h-4" />
                    <span>{game.category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Game Modules</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <button
              key={module.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all group text-left"
              onClick={() => {
                navigate(
                  getRoute(module.route, {
                    gameId: "123",
                  })
                );
              }}
            >
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}
              >
                {module.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {module.name}
              </h3>
              <p className="text-sm text-gray-600">{module.description}</p>
              <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium">
                <span>Open Module</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>

        {/* Game Stats */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Game Statistics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">12</div>
              <div className="text-sm text-gray-600 mt-1">Sessions</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">48h</div>
              <div className="text-sm text-gray-600 mt-1">Play Time</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">5</div>
              <div className="text-sm text-gray-600 mt-1">Players</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">89%</div>
              <div className="text-sm text-gray-600 mt-1">Completion</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
