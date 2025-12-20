import { Clock, Users, Trophy, ChevronRight } from "lucide-react";

interface GameInfo {
  title: string;
  description: string;
  image: string;
  players: string;
  duration: string;
  category: string;
}

interface HeroSectionProps {
  game: GameInfo;
  onBack: () => void;
}

export function HeroSection({ game, onBack }: HeroSectionProps) {
  return (
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
  );
}